# syntax=docker/dockerfile:1

# ─────────────────────────────────────────────────────────────────────────────
# Immagine di produzione multi-stage per Next.js (output "standalone").
# Pensata per deploy su qualsiasi runtime container (Fly, Railway, Render, K8s).
# ─────────────────────────────────────────────────────────────────────────────

ARG NODE_VERSION=22

# 1) Dipendenze: installa con cache, separato dal codice per sfruttare il layer cache.
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app
# OpenSSL serve a Prisma per i suoi engine.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# 2) Build: compila l'app in modalità standalone.
FROM node:${NODE_VERSION}-slim AS builder
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# 3) Runtime: immagine minimale con solo il necessario.
FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Utente non-root per sicurezza.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

# Output standalone: server + dipendenze tracciate.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Schema + client Prisma necessari a runtime per le migrazioni/deploy.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
