import { z } from 'zod';

/**
 * Variables de entorno de arranque (bootstrap). TODA la demás configuración
 * (SMTP, URL pública, dominios permitidos, etc.) vive en la base de datos y se
 * edita desde la página de Configuración.
 *
 * La validación es perezosa (se ejecuta en la primera lectura real) para no
 * romper `next build`, que importa módulos sin tener las variables presentes.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET debe tener al menos 32 caracteres'),
  APP_ENCRYPTION_KEY: z.string().min(32, 'APP_ENCRYPTION_KEY debe tener al menos 32 caracteres'),
  IP_HASH_SECRET: z.string().min(16, 'IP_HASH_SECRET debe tener al menos 16 caracteres'),
  APP_BASE_URL: z
    .string()
    .url()
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : undefined)),
  DATA_RETENTION_DAYS: z.coerce.number().int().positive().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  LOG_LEVEL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuración de entorno inválida:\n${msg}`);
  }
  cached = parsed.data;
  return cached;
}
