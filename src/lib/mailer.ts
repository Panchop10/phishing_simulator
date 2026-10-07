import nodemailer, { type Transporter } from 'nodemailer';
import type { AppSettings } from '@prisma/client';
import { getSmtpPassword } from './settings';

/** Construye el transporte SMTP (pool) a partir de la configuración guardada en la BD. */
export function buildTransport(settings: AppSettings): Transporter {
  const pass = getSmtpPassword(settings);
  return nodemailer.createTransport({
    host: settings.smtpHost ?? undefined,
    port: settings.smtpPort,
    secure: settings.smtpSecure, // true => TLS implícito (465); false => STARTTLS (587)
    auth: settings.smtpUser ? { user: settings.smtpUser, pass: pass ?? '' } : undefined,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: 'TLSv1.2' },
  });
}

/** Cabecera From, con posible override por campaña. */
export function fromHeader(
  settings: AppSettings,
  overrideName?: string | null,
  overrideEmail?: string | null,
): string {
  const name = (overrideName ?? settings.mailFromName ?? settings.orgName ?? '').replace(/"/g, '');
  const email = overrideEmail ?? settings.mailFromEmail ?? 'no-reply@example.com';
  return name ? `"${name}" <${email}>` : email;
}

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from: string;
  replyTo?: string | null;
  messageId?: string;
  headers?: Record<string, string>;
};

export async function sendOne(tx: Transporter, args: SendArgs) {
  return tx.sendMail({
    from: args.from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    replyTo: args.replyTo ?? undefined,
    messageId: args.messageId,
    headers: args.headers,
  });
}

/** Verifica la conexión SMTP (usado por el botón "Probar conexión"). */
export async function verifyTransport(settings: AppSettings): Promise<void> {
  const tx = buildTransport(settings);
  try {
    await tx.verify();
  } finally {
    tx.close();
  }
}

/** Clasifica un error SMTP como transitorio (reintentar) o permanente. */
export function isTransientSmtpError(err: unknown): boolean {
  const e = err as { responseCode?: number; code?: string };
  if (typeof e?.responseCode === 'number') {
    return e.responseCode >= 400 && e.responseCode < 500; // 4xx transitorio, 5xx permanente
  }
  const code = String(e?.code ?? '');
  return [
    'ECONNRESET',
    'ETIMEDOUT',
    'ESOCKET',
    'EAI_AGAIN',
    'ECONNECTION',
    'EDNS',
    'ETIMEOUT',
    'EENVELOPE',
  ].includes(code);
}
