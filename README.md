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
3. **Database:** `docker compose up -d db` (oppure usa un tuo PostgreSQL e aggiorna `DATABASE_URL`)
4. **Migrazione:** `npx prisma migrate dev` (applica lo schema e genera il client Prisma)
5. **App:** `npm run dev` → http://localhost:3000

> Nota: la prima migrazione (`prisma/migrations/*_init`) è già stata generata come SQL.
> Con un database attivo, `npx prisma migrate dev` la applica e si allinea.

## Struttura

- `prisma/` — modello dati (`schema.prisma`) e migrazioni
- `src/app/` — UI e route (Next.js App Router)
- `src/components/` — design system: primitive UI (`ui/`), header, brand, theme toggle
- `src/lib/` — utility condivise (`utils.ts` con `cn()`, `env.ts`)
- `src/server/` — logica server: `db.ts` (client Prisma), `secrets/` (SecretsVault), `modules/` (domini)
- `docs/` — analisi tecnica di Alloggiati Web (fattibilità + architettura)

## Qualità e tooling

- **Lint:** `npm run lint` (ESLint flat config + `next/core-web-vitals` + TypeScript)
- **Formattazione:** `npm run format` / `npm run format:check` (Prettier + plugin Tailwind)
- **Type check:** `npm run typecheck`
- **Test:** `npm test` (Vitest) — `npm run test:coverage` per la copertura
- **Pre-commit:** Husky + lint-staged eseguono lint+format sui file in staging
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) gira format/lint/typecheck/test/build su ogni PR
- **Dependabot:** aggiornamenti settimanali di npm e GitHub Actions

## Design system

- **Tailwind CSS v4** con token semantici in `src/app/globals.css` (light/dark via classe `.dark`)
- Componenti riusabili in `src/components/ui/` (Button, Card, Input, Label, Select, Badge)
- Font **Geist** via `next/font`, icone **lucide-react**, dark mode senza flash (FOUC)

## Docker (produzione)

Build standalone multi-stage, immagine minimale con utente non-root e healthcheck:

```bash
docker build -t compliance .
docker run -p 3000:3000 --env-file .env compliance
```

Health check: `GET /api/health`.

## Principi (vedi `docs/`)

- I segreti delle credenziali Alloggiati **non** sono mai salvati in chiaro: passano dal `SecretsVault`.
- Gli invii ad Alloggiati seguono il pattern **outbox** (invio irreversibile, `Send` non idempotente).
