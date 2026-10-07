import { prisma } from './prisma';
import { hashIp } from './crypto';
import { looksLikeBot } from './security';

/**
 * Registra una apertura. El `status` del destinatario refleja el ciclo de ENVÍO
 * (PENDING/SENDING/SENT/FAILED/SUPPRESSED); la interacción (abrió/clic) se deriva
 * de firstOpenedAt/firstClickedAt, NUNCA del status.
 */
export async function recordOpen(
  token: string,
  ip: string | null,
  userAgent: string | null,
): Promise<void> {
  const r = await prisma.campaignRecipient.findUnique({
    where: { token },
    select: { id: true, campaignId: true, sentAt: true, firstOpenedAt: true },
  });
  if (!r) return;
  const now = new Date();
  const bot = looksLikeBot(userAgent, r.sentAt, now);
  await prisma.$transaction([
    prisma.trackingEvent.create({
      data: {
        campaignRecipientId: r.id,
        campaignId: r.campaignId,
        type: 'OPEN',
        ipHash: hashIp(ip),
        userAgent: userAgent?.slice(0, 300) ?? null,
        suspectedBot: bot,
        occurredAt: now,
      },
    }),
    prisma.campaignRecipient.update({
      where: { id: r.id },
      data: {
        openCount: { increment: 1 },
        ...(r.firstOpenedAt ? {} : { firstOpenedAt: now }),
      },
    }),
  ]);
}

/** Registra un clic (análogo a recordOpen). */
export async function recordClick(
  token: string,
  ip: string | null,
  userAgent: string | null,
): Promise<boolean> {
  const r = await prisma.campaignRecipient.findUnique({
    where: { token },
    select: { id: true, campaignId: true, sentAt: true, firstClickedAt: true },
  });
  if (!r) return false;
  const now = new Date();
  const bot = looksLikeBot(userAgent, r.sentAt, now);
  await prisma.$transaction([
    prisma.trackingEvent.create({
      data: {
        campaignRecipientId: r.id,
        campaignId: r.campaignId,
        type: 'CLICK',
        ipHash: hashIp(ip),
        userAgent: userAgent?.slice(0, 300) ?? null,
        suspectedBot: bot,
        occurredAt: now,
      },
    }),
    prisma.campaignRecipient.update({
      where: { id: r.id },
      data: {
        clickCount: { increment: 1 },
        ...(r.firstClickedAt ? {} : { firstClickedAt: now }),
      },
    }),
  ]);
  return true;
}
