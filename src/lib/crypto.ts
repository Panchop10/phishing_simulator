import crypto from 'node:crypto';
import { serverEnv } from './env';

/** Deriva una clave AES de 32 bytes desde APP_ENCRYPTION_KEY (acepta hex/base64/texto). */
function aesKey(): Buffer {
  return crypto.createHash('sha256').update(serverEnv().APP_ENCRYPTION_KEY).digest();
}

/** Cifra un secreto (ej. contraseña SMTP) para guardarlo en la base de datos. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

/** Descifra un secreto previamente cifrado con encryptSecret(). */
export function decryptSecret(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('Formato de secreto cifrado no reconocido');
  }
  const [, ivB, tagB, dataB] = parts;
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey(), Buffer.from(ivB, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** HMAC de una IP para almacenarla sin guardar la IP en bruto (minimización de datos). */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return crypto
    .createHmac('sha256', serverEnv().IP_HASH_SECRET)
    .update(ip)
    .digest('hex')
    .slice(0, 32);
}
