import crypto from 'node:crypto';

/** Token por destinatario, aleatorio y no adivinable (256 bits, apto para URL). */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}
