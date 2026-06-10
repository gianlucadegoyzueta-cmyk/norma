# CLAUDE.md — Norma

Contesto operativo per Claude (Code, Cowork, agenti). Leggi PRIMA di toccare il codice.

## Cos'è Norma

SaaS di compliance per affitti brevi in Italia (norma.casa, app su app.norma.casa, €12/mese).
Fa al posto dell'host: schedine Alloggiati Web (Polizia di Stato), tassa di soggiorno,
ISTAT, gestione CIN, check-in ospiti self-service multilingua.

- **Stack:** Next.js App Router + TypeScript strict + PostgreSQL (Supabase, Frankfurt) + Prisma.
  Deploy su Vercel (progetto `norma`, team `norma-compliance`). Marketing site = repo separato `norma-marketing`.
- **Architettura:** moduli dominio in `src/server/modules/*` (alloggiati, checkin, cin, istat,
  onboarding, properties, stays, tourist-tax) con pattern ports/adapters. Domain = puro e
  testabile; I/O negli adapters. Outbox pattern per gli invii (Send NON idempotente).
- **Segreti ospiti/credenziali:** mai in chiaro — passano dal `SecretsVault` (`src/server/secrets/`).

## Comandi

- `npm run dev` · `npm test` (vitest) · `npm run typecheck` · `npm run lint` · `npm run format`
- CI completa locale: format && lint && typecheck && test && build — TUTTO verde prima di ogni PR.
- Live test Alloggiati (richiedono credenziali in .env, MAI in CI):
  `npm run alloggiati:gate0-pdf` · `alloggiati:live-check` · ecc. (gated da env RUN\_\*)
- DB: `npm run db:migrate` (dev) · `db:deploy` (prod, vedi guardrail) · `db:studio`

## Guardrail (non negoziabili)

1. **MAI un Send reale alla Questura come prova.** Il primo invio di una schedina vera si fa
   solo su ospite reale, con decisione esplicita di Gianluca. I metodi `Test` del WS sono ok.
2. **Migrazioni prod solo con backup fresco.** Backup automatico giornaliero alle 9:30
   (`~/bin/norma-backup.sh` → `~/backups/norma/`, launchd `com.norma.backup`). Prima di una
   migrazione: esegui lo script a mano e verifica `backup.log`, poi `prisma migrate deploy`.
3. **PII fuori dal repo:** PDF ricevute reali, dump, dati ospiti → `tmp/` (gitignored). Le
   fixture nei test sono SEMPRE anonimizzate.
4. **Niente push su main:** branch + PR, CI verde, poi merge. Convenzione commit: `feat(scope): …` in italiano.
5. `.env` non si committa; `supabase/.temp/` è gitignored.

## Decisioni chiave (vedi DECISIONS.md)

- **D0:** unità spedibili = senza migrazioni o con backup garantito (ora c'è: vedi guardrail 2).
- **D1:** un solo brand "Carta & Inchiostro" (terracotta/avorio/Fraunces), evoluzione non rivoluzione.
- **D2:** outbox `MAX_SEND_ATTEMPTS=5`, incremento attempts solo in `claimForSending`.
- **D3 (verdetto Gate #0, 2026-06-10):** la Ricevuta Alloggiati è AGGREGATA (niente nominativi):
  riconciliazione T+1 per CONTEGGIO via `RicevutaSummary`. Parser: `domain/ricevuta-summary.ts`
  - `adapters/ricevuta-pdf-text.ts` (unpdf).

## Stato e roadmap (aggiorna quando cambia)

- ✅ Canale SOAP Questura verificato live (Gate #0, 2026-06-10). Parser ricevuta: #53. Reconcile per conteggio: #55.
- ⛔ **Invii reali CONGELATI per decisione di Gianluca (2026-06-10):** prima si completa il resto
  del prodotto. PR #56 (cron) resta aperta e NON va mergiata/attivata. Non riproporre.
- 🔜 P1 (focus attuale): Stripe billing (€12/mese promesso sul sito) · import iCal Airbnb/Booking · Sentry.
- 🔜 P2: ISTAT invio regionale reale (Ross1000/Lazio) · PDF tassa di soggiorno · review design system (PR #52, occhi umani).
- Backlog umano: NEEDS-HUMAN.md. Log notturni: NIGHT-LOG.md.

## Regole flotta (corse notturne parallele su worktree)

- Ogni corsia lavora SOLO nel suo worktree e nei moduli della sua spec (`.claude/specs/`).
- UNA SOLA corsia per notte è autorizzata alle migrazioni schema (lo dice la spec). Le altre:
  migration generata ma NON applicata, PR aperta, nota in NEEDS-HUMAN.
- Prima del push finale: `git fetch` + rebase su origin/main (package-lock si risolve
  rigenerando: `env NODE_ENV= npm install`). Merge sequenziali, mai forzare.
- Conflitto che non sai risolvere in 10 minuti → PR aperta senza merge + nota in NIGHT-LOG.

## Quirk ambiente (Mac di Gianluca)

- Le shell spawnante da Claude Desktop hanno `NODE_ENV=production` → **anteporre sempre
  `env NODE_ENV=`** a npm/npx/vitest, altrimenti npm salta i devDependencies.
- Toolchain in `~/bin` (gh, supabase, jq) e `~/.npm-global/bin` (vercel, claude). Homebrew in `/opt/homebrew`.
- gh/vercel/supabase CLI: già autenticati. Supabase: progetto linkato (`supabase/.temp`).
