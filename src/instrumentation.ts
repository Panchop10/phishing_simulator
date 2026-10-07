/**
 * Hook de Next que corre una vez por proceso. El worker de envío usa APIs de
 * Node (nodemailer, crypto), por lo que TODA la lógica va dentro del bloque
 * `NEXT_RUNTIME === 'nodejs'`: así el DefinePlugin de Next elimina estas
 * importaciones del build de Edge (middleware) y no intenta empaquetar `node:*`.
 *
 * Nota: instrumentation.ts se compila sin los alias de rutas de tsconfig; se usan
 * importaciones relativas en lugar de "@/".
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.WORKER_ENABLED !== 'false') {
    const { startWorker, stopWorker } = await import('./lib/campaigns/worker');
    const { beginShutdown } = await import('./lib/lifecycle');
    const { prisma } = await import('./lib/prisma');
    const { logger } = await import('./lib/logger');

    startWorker();

    let shuttingDown = false;
    const shutdown = async (signal: string) => {
      if (shuttingDown) return;
      shuttingDown = true;
      logger.info({ signal }, 'recibida señal de apagado');
      beginShutdown();
      await stopWorker();
      await prisma.$disconnect().catch(() => {});
      process.exit(0);
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));
  }
}
