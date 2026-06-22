# CLAUDE.md — Norma

Contesto operativo per Claude (Code, Cowork, agenti). Leggi PRIMA di toccare il codice.

## Cos'è Norma

SaaS di compliance per affitti brevi in Italia (norma.casa, app su app.norma.casa,
€120/anno — gratis fino al primo ospite gestito). **Pivot 2026-06-17: due soli pilastri ricorrenti.**

1. **Alloggiati** — schedine alla Polizia di Stato (Alloggiati Web, art. 109 TULPS).
2. **Turismo** — tassa di soggiorno + ISTAT/movimento turistico (Ross1000 e portali regionali).

Tutto il resto serve i due pilastri: check-in self-service multilingua, import iCal, stays,
properties, onboarding alimentano schedine e dichiarazioni. **CIN non è un pilastro né sta nel
pitch** (adempimento una-tantum): NON si vende. Ma resta nel prodotto perché è load-bearing —
`Property.cin` è richiesto dalla dichiarazione tassa di soggiorno (`tourist-tax/actions.ts`):
NON rimuoverlo, NON deprecare il modulo. Verità editoriale: "Norma prepara, tu confermi con un
click" — mai "invia da sola".

- **Stack:** Next.js App Router + TypeScript strict + PostgreSQL (Supabase, Frankfurt) + Prisma.
  Deploy su Vercel (progetto `norma`, team `norma-compliance`). Marketing site = repo separato `norma-marketing`.
- **Architettura:** moduli dominio in `src/server/modules/*` (alloggiati, checkin, istat,
  onboarding, properties, reservations, stays, tourist-tax; `cin` = **enabler** della tassa, non in pitch) con pattern
  ports/adapters. Domain = puro e testabile; I/O negli adapters. Outbox pattern per gli invii (Send NON idempotente).
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

- ✅ **Pilastro Alloggiati:** schedine/outbox, canale SOAP verificato (Gate #0, 2026-06-10),
  reconcile T+1 per conteggio (#55), auto-send opt-in + Test-gated + DRY-RUN (#99, **spento di default**) — in prod.
- ✅ **Pilastro Turismo:** tassa di soggiorno (report/CSV/PDF, #35), ISTAT Ross1000 export XML
  per-struttura + routing regionale (#98) — in prod. Invio regionale reale (Lazio) = prossimo gate.
- ✅ Infra: billing €120/anno in prod ma **DORMIENTE** (mancano chiavi test + SDI) · Sentry EU PII-safe (#93)
  · import iCal (#65) · design system unico "carta", no dark mode (#97).
- 🔜 **Copertura turismo nazionale + automazione funnel** (branch `feat/movimento-turistico-nuove-regioni`):
  Puglia (SPOT) e Umbria (Turismatica C59) a FILE end-to-end; serializer + client Sicilia (WebAPI PMS) con
  trasmissione gated; check-in → schedine automatiche; re-sync iCal (cron gated). Cancelli umani + adapter
  futuri (Campania/VdA/FVG/Trento/Bolzano) e vault credenziali parcheggiato: NEEDS-HUMAN §9.
- ⛔ **Primo invio reale (Alloggiati e ISTAT) = decisione esplicita di Gianluca su ospite vero**
  (guardrail #1). L'auto-send esiste ma è spento: non accenderlo in autonomia, non riproporlo.
- 🔜 Focus: chiudere il redesign app (in volo, `feat/app-redesign`) + **GTM** (KPI: 3 conversazioni host/giorno).
- Backlog umano: NEEDS-HUMAN.md. Log notturni: NIGHT-LOG.md.

## Costituzione operativa (/ops — vincolante)

Il sistema opera sotto il Sovereign System Package adattato: leggi `/ops/INDEX.md` (mappa
sul sistema vivo), `AGENT_LAWS.md` (leggi e **frozen areas concrete**), `GOVERNOR_RULES.md`.
Precedenza in conflitto: CLAUDE.md → /ops → spec di corsia.

## Governance (docs/ops/GOVERNANCE.md — vincolante)

Ogni unità dichiara la sua **classe di rischio** (LOW/MEDIUM/HIGH/CRITICAL) nel PR body e
ne rispetta le regole di merge. Richieste al founder nel formato standard (decisione/
opzioni/raccomandazione/rischio/scadenza). Report con chiusura: Deciso·Rischio·Evidenza·
Prossima azione.

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
- Docker: via **colima** (niente Docker Desktop). Se `docker ps` fallisce: `colima start`.
  Postgres locale per test migrazioni: `docker compose up -d db` (vedi docker-compose.yml).
- Playwright: chromium già in cache condivisa (~/Library/Caches/ms-playwright).
