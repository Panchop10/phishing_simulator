import pino from 'pino';

/** Logger estructurado (JSON a stdout). Nunca registra secretos ni cuerpos completos. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: [
      'smtpPasswordEnc',
      'smtpPassword',
      'password',
      'passwordHash',
      'token',
      'SMTP_PASS',
      'SESSION_SECRET',
      'APP_ENCRYPTION_KEY',
      'IP_HASH_SECRET',
    ],
    censor: '[oculto]',
  },
});
