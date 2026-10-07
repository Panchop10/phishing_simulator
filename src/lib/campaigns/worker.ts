import { prisma } from '../prisma';
import { logger } from '../logger';
import { isShuttingDown } from '../lifecycle';
import { getSettings, isSmtpConfigured, effectiveBaseUrl, getSmtpPassword } from '../settings';
import { buildTransport, fromHeader, sendOne, isTransientSmtpError } from '../mailer';
import { renderEmail } from '../templating';

type WorkerState = {
  started: boolean;
  running: boolean;
  inFlight: boolean;
  wake: (() => void) | null;
};

const g = globalThis as unknown as { __phishWorker?: WorkerState };
function state(): WorkerState {
  return (g.__phishWorker ??= { started: false, running: false, inFlight: false, wake: null });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function pollIntervalMs(): number {
  return Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000);
}
function maxAttempts(): number {
  return Number(process.env.SEND_MAX_ATTEMPTS ?? 4);
}
function backoff(attempts: number): number {
  const base = Number(process.env.SEND_BACKOFF_BASE_MS ?? 30_000);
  const max = Number(process.env.SEND_BACKOFF_MAX_MS ?? 1_800_000);
  const jitter = Math.floor(Math.random() * 5000);
  return Math.min(base * 2 ** attempts, max) + jitter;
}

type ClaimRow = {
  id: string;
  email: string;
  nombre: string | null;
  cargo: string | null;
  departamento: string | null;
  token: string;
  attempts: number;
};

/** Reclama un lote de destinatarios PENDING con FOR UPDATE SKIP LOCKED (Postgres como cola). */
async function claimBatch(campaignId: string, batchSize: number): Promise<ClaimRow[]> {
  return prisma.$queryRaw<ClaimRow[]>`
    UPDATE "CampaignRecipient" SET status = 'SENDING', "lockedAt" = now(), "updatedAt" = now()
    WHERE id IN (
      SELECT id FROM "CampaignRecipient"
      WHERE "campaignId" = ${campaignId}
        AND status = 'PENDING'
        AND ("nextAttemptAt" IS NULL OR "nextAttemptAt" <= now())
      ORDER BY "createdAt" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, email, nombre, cargo, departamento, token, attempts`;
}

/** Marca como SENT las campañas en SENDING que ya no tienen destinatarios PENDING. */
async function finalizeCampaigns(): Promise<void> {
  const sending = await prisma.campaign.findMany({ where: { status: 'SENDING' }, select: { id: true } });
  for (const c of sending) {
    const pend = await prisma.campaignRecipient.count({
      where: { campaignId: c.id, status: { in: ['PENDING', 'SENDING'] } },
    });
    if (pend === 0) {
      await prisma.campaign.update({
        where: { id: c.id },
        data: { status: 'SENT', completedAt: new Date() },
      });
      logger.info({ campaignId: c.id }, 'campaña completada');
    }
  }
}

async function processOnce(s: WorkerState): Promise<boolean> {
  const campaign = await prisma.campaign.findFirst({
    where: {
      status: 'SENDING',
      recipients: {
        some: {
          status: 'PENDING',
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: new Date() } }],
        },
      },
    },
    orderBy: { launchedAt: 'asc' },
  });

  if (!campaign) {
    await finalizeCampaigns();
    return false;
  }

  const settings = await getSettings();
  if (!isSmtpConfigured(settings) || !effectiveBaseUrl(settings)) {
    logger.warn({ campaignId: campaign.id }, 'SMTP/URL no configurados; envío en pausa');
    return false;
  }
  const baseUrl = effectiveBaseUrl(settings)!;
  const batchSize = Math.max(1, settings.sendBatchSize);
  const delayMs = Math.ceil(60_000 / Math.max(1, settings.sendRatePerMinute));
  const subject = campaign.subjectSnapshot ?? '';
  const bodyHtml = campaign.bodyHtmlSnapshot ?? '';
  const from = fromHeader(settings, campaign.fromName, campaign.fromEmail);
  const replyTo = settings.mailReplyTo;

  const claimed = await claimBatch(campaign.id, batchSize);
  if (claimed.length === 0) {
    await finalizeCampaigns();
    return false;
  }

  // Validación defensiva: si no se puede descifrar la contraseña, revertir y parar.
  try {
    getSmtpPassword(settings);
  } catch (e) {
    logger.error({ err: String(e) }, 'no se pudo descifrar la contraseña SMTP');
    await prisma.campaignRecipient.updateMany({
      where: { id: { in: claimed.map((c) => c.id) } },
      data: { status: 'PENDING', lockedAt: null },
    });
    return false;
  }

  const tx = buildTransport(settings);
  s.inFlight = true;
  try {
    for (const rec of claimed) {
      if (!s.running || isShuttingDown()) {
        // Devolver lo no enviado a PENDING para que se reanude tras el reinicio.
        await prisma.campaignRecipient.update({
          where: { id: rec.id },
          data: { status: 'PENDING', lockedAt: null },
        });
        continue;
      }
      const clickUrl = `${baseUrl}/api/track/click/${rec.token}`;
      const openPixelUrl = `${baseUrl}/api/track/open/${rec.token}`;
      const { html, text } = renderEmail({
        bodyHtml,
        vars: { nombre: rec.nombre, email: rec.email, cargo: rec.cargo, departamento: rec.departamento },
        clickUrl,
        openPixelUrl,
      });
      try {
        const info = await sendOne(tx, {
          to: rec.email,
          subject,
          html,
          text,
          from,
          replyTo,
          headers: { 'X-Phishing-Simulation': 'true', 'X-Campaign-Id': campaign.id },
        });
        await prisma.campaignRecipient.update({
          where: { id: rec.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            lockedAt: null,
            messageId: info.messageId ?? null,
            lastError: null,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const attempts = rec.attempts + 1;
        const transient = isTransientSmtpError(err);
        if (transient && attempts < maxAttempts()) {
          await prisma.campaignRecipient.update({
            where: { id: rec.id },
            data: {
              status: 'PENDING',
              attempts,
              lockedAt: null,
              nextAttemptAt: new Date(Date.now() + backoff(attempts)),
              lastError: msg.slice(0, 500),
            },
          });
        } else {
          await prisma.campaignRecipient.update({
            where: { id: rec.id },
            data: { status: 'FAILED', attempts, lockedAt: null, lastError: msg.slice(0, 500) },
          });
        }
        logger.warn({ campaignId: campaign.id, transient }, 'fallo al enviar correo');
      }
      if (delayMs > 0) await sleep(delayMs);
    }
  } finally {
    s.inFlight = false;
    tx.close();
  }

  await finalizeCampaigns();
  return true;
}

/** Al arrancar: revierte cualquier destinatario SENDING a PENDING (recuperación tras caída). */
async function resetInFlightOnBoot(): Promise<void> {
  const res = await prisma.campaignRecipient.updateMany({
    where: { status: 'SENDING' },
    data: { status: 'PENDING', lockedAt: null },
  });
  if (res.count > 0) logger.info({ count: res.count }, 'destinatarios SENDING recuperados a PENDING');
}

async function loop(s: WorkerState): Promise<void> {
  await resetInFlightOnBoot().catch((e) => logger.error({ err: String(e) }, 'error en recuperación de arranque'));
  while (s.running) {
    if (isShuttingDown()) break;
    let didWork = false;
    try {
      didWork = await processOnce(s);
    } catch (e) {
      logger.error({ err: String(e) }, 'error en el ciclo del worker');
    }
    if (!s.running || isShuttingDown()) break;
    if (!didWork) {
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          s.wake = null;
          resolve();
        }, pollIntervalMs());
        s.wake = () => {
          clearTimeout(t);
          s.wake = null;
          resolve();
        };
      });
    }
  }
  s.started = false;
  logger.info('worker detenido');
}

export function startWorker(): void {
  const s = state();
  if (s.started) return;
  s.started = true;
  s.running = true;
  logger.info('worker de envío iniciado');
  void loop(s);
}

/** Despierta el worker para procesar de inmediato (llamado al lanzar una campaña). */
export function wakeWorker(): void {
  const s = state();
  if (s.wake) s.wake();
}

/** Apagado ordenado: deja de reclamar, espera el envío en curso (acotado). */
export async function stopWorker(): Promise<void> {
  const s = state();
  s.running = false;
  if (s.wake) s.wake();
  const deadline = Date.now() + 25_000;
  while (s.inFlight && Date.now() < deadline) await sleep(200);
}
