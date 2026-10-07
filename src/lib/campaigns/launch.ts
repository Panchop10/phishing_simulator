import { prisma } from '../prisma';
import { getSettings, isSmtpConfigured, effectiveBaseUrl } from '../settings';
import { parseAllowedDomains, isEmailAllowed } from '../security';
import { hasLinkPlaceholder } from '../templating';
import { wakeWorker } from './worker';

export type LaunchResult =
  | { ok: true; suppressed: number; toSend: number }
  | { ok: false; code: string; message: string };

function fail(code: string, message: string): LaunchResult {
  return { ok: false, code, message };
}

/**
 * Valida y lanza una campaña: aplica la lista de dominios permitidos, toma una
 * instantánea de la plantilla y la marca como SENDING. No envía dentro de la
 * petición: despierta al worker en segundo plano.
 */
export async function launchCampaign(campaignId: string): Promise<LaunchResult> {
  const settings = await getSettings();
  const baseUrl = effectiveBaseUrl(settings);
  if (!baseUrl) return fail('SIN_URL', 'Configura la URL pública en Configuración antes de lanzar.');
  if (!isSmtpConfigured(settings)) {
    return fail('SIN_SMTP', 'Configura el servidor SMTP en Configuración antes de lanzar.');
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { template: true, _count: { select: { recipients: true } } },
  });
  if (!campaign) return fail('NO_EXISTE', 'La campaña no existe.');
  if (campaign.status !== 'DRAFT') return fail('ESTADO', 'Solo se pueden lanzar campañas en borrador.');
  if (!campaign.template) return fail('SIN_PLANTILLA', 'La campaña no tiene una plantilla asignada.');
  if (!hasLinkPlaceholder(campaign.template.bodyHtml)) {
    return fail('SIN_ENLACE', 'La plantilla debe incluir el marcador {{enlace}}.');
  }
  if (campaign._count.recipients === 0) {
    return fail('SIN_DESTINATARIOS', 'La campaña no tiene destinatarios. Importa un CSV primero.');
  }

  const domains = parseAllowedDomains(settings.allowedRecipientDomains);
  let suppressed = 0;
  if (domains.length > 0) {
    const pend = await prisma.campaignRecipient.findMany({
      where: { campaignId, status: 'PENDING' },
      select: { id: true, email: true },
    });
    const toSuppress = pend.filter((r) => !isEmailAllowed(r.email, domains)).map((r) => r.id);
    if (toSuppress.length) {
      await prisma.campaignRecipient.updateMany({
        where: { id: { in: toSuppress } },
        data: { status: 'SUPPRESSED' },
      });
      suppressed = toSuppress.length;
    }
  }

  const toSend = await prisma.campaignRecipient.count({ where: { campaignId, status: 'PENDING' } });
  if (toSend === 0) {
    return fail('TODOS_SUPRIMIDOS', 'Todos los destinatarios quedaron fuera de los dominios permitidos.');
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: 'SENDING',
      launchedAt: new Date(),
      subjectSnapshot: campaign.template.subject,
      bodyHtmlSnapshot: campaign.template.bodyHtml,
    },
  });

  wakeWorker();
  return { ok: true, suppressed, toSend };
}
