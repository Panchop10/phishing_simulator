import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSettings, updateSettings, toPublicSettings } from '@/lib/settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const s = await getSettings();
  return NextResponse.json(toPublicSettings(s));
}

const schema = z.object({
  appBaseUrl: z.string().url('URL inválida').or(z.literal('')).nullish(),
  orgName: z.string().max(120).nullish(),
  securityContactEmail: z.string().email('Correo inválido').or(z.literal('')).nullish(),
  smtpHost: z.string().max(255).nullish(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().max(255).nullish(),
  smtpPassword: z.string().max(500).nullish(), // ausente = sin cambios
  mailFromName: z.string().max(120).nullish(),
  mailFromEmail: z.string().email('Correo "De" inválido').or(z.literal('')).nullish(),
  mailReplyTo: z.string().email('Reply-To inválido').or(z.literal('')).nullish(),
  allowedRecipientDomains: z.string().max(1000).nullish(),
  sendRatePerMinute: z.coerce.number().int().min(1).max(10000).optional(),
  sendBatchSize: z.coerce.number().int().min(1).max(1000).optional(),
  maxRecipientsPerCampaign: z.coerce.number().int().min(1).max(1_000_000).optional(),
});

const norm = (v: string | null | undefined) => (v === undefined ? undefined : v === '' ? null : v);

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos.', issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;
  const s = await updateSettings({
    appBaseUrl: norm(d.appBaseUrl),
    orgName: norm(d.orgName),
    securityContactEmail: norm(d.securityContactEmail),
    smtpHost: norm(d.smtpHost),
    smtpPort: d.smtpPort,
    smtpSecure: d.smtpSecure,
    smtpUser: norm(d.smtpUser),
    smtpPassword: d.smtpPassword === undefined ? undefined : d.smtpPassword === '' ? null : d.smtpPassword,
    mailFromName: norm(d.mailFromName),
    mailFromEmail: norm(d.mailFromEmail),
    mailReplyTo: norm(d.mailReplyTo),
    allowedRecipientDomains: norm(d.allowedRecipientDomains),
    sendRatePerMinute: d.sendRatePerMinute,
    sendBatchSize: d.sendBatchSize,
    maxRecipientsPerCampaign: d.maxRecipientsPerCampaign,
  });
  return NextResponse.json(toPublicSettings(s));
}
