# Compliance — SaaS Affitti Brevi (Italia)

Scheletro del progetto: **Next.js (App Router) + TypeScript + PostgreSQL + Prisma**.
Questa fase imposta SOLO le fondamenta e il modello dati; le funzionalità si costruiscono sopra.

## Requisiti
- Node.js 20+ (testato su 22)
- Un database PostgreSQL. In locale il modo più semplice è il `docker-compose.yml` incluso.

## Avvio rapido (sviluppo)
1. **Dipendenze:** `npm install`
2. **Env:** lo script di setup crea già un `.env` con una `SECRETS_LOCAL_KEY` generata.
   (Riferimento dei campi in `.env.example`.)
3. **Database:** `docker compose up -d db`  (oppure usa un tuo PostgreSQL e aggiorna `DATABASE_URL`)
4. **Migrazione:** `npx prisma migrate dev`  (applica lo schema e genera il client Prisma)
5. **App:** `npm run dev`  → http://localhost:3000

> Nota: la prima migrazione (`prisma/migrations/*_init`) è già stata generata come SQL.
> Con un database attivo, `npx prisma migrate dev` la applica e si allinea.

## Struttura
- `prisma/` — modello dati (`schema.prisma`) e migrazioni
- `src/app/` — UI e route (Next.js App Router)
- `src/server/` — logica server: `db.ts` (client Prisma), `secrets/` (SecretsVault), `modules/` (domini)
- `docs/` — analisi tecnica di Alloggiati Web (fattibilità + architettura)

## Principi (vedi `docs/`)
- I segreti delle credenziali Alloggiati **non** sono mai salvati in chiaro: passano dal `SecretsVault`.
- Gli invii ad Alloggiati seguono il pattern **outbox** (invio irreversibile, `Send` non idempotente).
