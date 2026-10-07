/** Bandera global de apagado para coordinar readiness + worker en SIGTERM. */
const g = globalThis as unknown as { __shuttingDown?: boolean };

export function beginShutdown() {
  g.__shuttingDown = true;
}

export function isShuttingDown(): boolean {
  return g.__shuttingDown === true;
}
