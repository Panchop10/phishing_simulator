#!/usr/bin/env bash
# Arranque en un comando: genera secretos, levanta Postgres + la app y
# aplica las migraciones automáticamente.
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker no está instalado. Instálalo primero (o usa scripts/ec2-bootstrap.sh)." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "✗ El demonio de Docker no está en ejecución. Inícialo e inténtalo de nuevo." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "→ Generando .env con secretos aleatorios…"
  cat > .env <<ENVEOF
POSTGRES_USER=app
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=phishing
SESSION_SECRET=$(openssl rand -base64 48 | tr -d '\n')
APP_ENCRYPTION_KEY=$(openssl rand -hex 32)
IP_HASH_SECRET=$(openssl rand -hex 32)
APP_BASE_URL=
APP_PORT=3000
ENVEOF
  echo "  .env creado."
else
  echo "→ .env ya existe; se usa el actual."
fi

PORT="$(grep -E '^APP_PORT=' .env | cut -d= -f2)"
PORT="${PORT:-3000}"

echo "→ Construyendo y levantando contenedores (app + base de datos)…"
docker compose -f docker-compose.yml up -d --build

echo -n "→ Esperando a que la aplicación responda"
ok=0
for _ in $(seq 1 90); do
  if curl -fsS "http://localhost:${PORT}/api/health" >/dev/null 2>&1; then ok=1; break; fi
  echo -n "."; sleep 2
done
echo
if [ "$ok" = "1" ]; then
  echo "✓ Listo. Abre http://localhost:${PORT} y crea tu cuenta de administrador."
  echo "  Luego ve a Configuración para definir el SMTP y la URL pública."
else
  echo "⚠ La app todavía no responde. Revisa los registros con: docker compose logs -f app"
fi
