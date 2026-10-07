import type { AppSettings } from '@prisma/client';
import { prisma } from './prisma';
import { serverEnv } from './env';
import { encryptSecret, decryptSecret } from './crypto';

const SINGLETON = 'singleton';
const CACHE_TTL_MS = 10_000;

const g = globalThis as unknown as { __settingsCache?: { value: AppSettings; at: number } | null };

/** Carga (y memoiza por 10s) la fila única de configuración, creándola si falta. */
export async function getSettings(): Promise<AppSettings> {
  const now = Date.now();
  if (g.__settingsCache && now - g.__settingsCache.at < CACHE_TTL_MS) {
    return g.__settingsCache.value;
  }
  let s = await prisma.appSettings.findUnique({ where: { id: SINGLETON } });
  if (!s) s = await prisma.appSettings.create({ data: { id: SINGLETON } });
  g.__settingsCache = { value: s, at: now };
  return s;
}

export function invalidateSettingsCache() {
  g.__settingsCache = null;
}

/** Campos de negocio editables desde la página de Configuración. */
export type SettingsInput = {
  appBaseUrl?: string | null;
  orgName?: string | null;
  securityContactEmail?: string | null;
  smtpHost?: string | null;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string | null;
  mailFromName?: string | null;
  mailFromEmail?: string | null;
  mailReplyTo?: string | null;
  allowedRecipientDomains?: string | null;
  sendRatePerMinute?: number;
  sendBatchSize?: number;
  maxRecipientsPerCampaign?: number;
  /** Texto plano: se cifra al guardar. undefined = sin cambios; '' o null = borrar. */
  smtpPassword?: string | null;
};

export async function updateSettings(input: SettingsInput): Promise<AppSettings> {
  const { smtpPassword, ...rest } = input;
  const data: Record<string, unknown> = { ...rest };
  if (smtpPassword === null || smtpPassword === '') {
    data.smtpPasswordEnc = null;
  } else if (typeof smtpPassword === 'string') {
    data.smtpPasswordEnc = encryptSecret(smtpPassword);
  }
  const s = await prisma.appSettings.upsert({
    where: { id: SINGLETON },
    update: data,
    create: { id: SINGLETON, ...data },
  });
  invalidateSettingsCache();
  return s;
}

/** Contraseña SMTP en texto plano (solo en el servidor, al enviar correo). */
export function getSmtpPassword(settings: AppSettings): string | null {
  if (!settings.smtpPasswordEnc) return null;
  return decryptSecret(settings.smtpPasswordEnc);
}

/** El SMTP está listo para enviar. */
export function isSmtpConfigured(settings: AppSettings): boolean {
  return Boolean(settings.smtpHost && settings.mailFromEmail);
}

/** URL pública efectiva para construir los enlaces de rastreo. */
export function effectiveBaseUrl(settings: AppSettings): string | undefined {
  return settings.appBaseUrl || serverEnv().APP_BASE_URL;
}

/** Vista segura para el cliente: nunca expone la contraseña cifrada. */
export function toPublicSettings(settings: AppSettings) {
  const { smtpPasswordEnc, ...safe } = settings;
  return {
    ...safe,
    smtpPasswordSet: Boolean(smtpPasswordEnc),
    smtpConfigured: isSmtpConfigured(settings),
    baseUrl: effectiveBaseUrl(settings) ?? null,
  };
}

export type PublicSettings = ReturnType<typeof toPublicSettings>;
