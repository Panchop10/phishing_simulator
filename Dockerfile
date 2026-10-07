# syntax=docker/dockerfile:1

############################
# 1. deps — todas las dependencias (incluye dev) para compilar
############################
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

############################
# 2. builder — genera el cliente Prisma y compila Next (standalone)
############################
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

############################
# 3. prod-deps — solo dependencias de producción + cliente Prisma + CLI
#    (incluye el CLI de prisma y su árbol para ejecutar `migrate deploy`)
############################
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

############################
# 4. runner — imagen de ejecución (no-root)
############################
FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Servidor standalone + estáticos (standalone NO copia static ni public).
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
# node_modules de producción (superset): habilita `node server.js` y `prisma migrate deploy`.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# Esquema + migraciones para `migrate deploy`.
COPY --from=builder --chown=node:node /app/prisma ./prisma
# Scripts auxiliares (datos de ejemplo: `node scripts/seed-demo.mjs`).
COPY --from=builder --chown=node:node /app/scripts ./scripts

USER node
EXPOSE 3000
CMD ["node", "server.js"]
