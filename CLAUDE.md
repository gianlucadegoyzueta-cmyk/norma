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
NON rimuoverlo, NON deprecare il modulo. **Verità editoriale (rev. 2026-06-23): "Norma esegue per
te" — invio automatico agli enti su mandato firmato una volta; "se sbagliamo noi, paghiamo noi"
(garanzia commerciale a cap sul danno da nostro errore tecnico, MAI assunzione di responsabilità
penale — vedi guardrail #1).** Positioning: **compliance garantita in automatico per affitti brevi**
(l'auto-send è commodity: il fossato è la garanzia + reconcile/ricevute che la reggono).

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

1. **Automazione con delega + safeguard** (rev. 2026-06-23 — sostituisce "mai invia da sola").
   Norma invia in automatico agli enti (Alloggiati, tassa di soggiorno, ISTAT) **senza click
   per-evento**, su un **mandato firmato una volta** (3 deleghe distinte per pilastro: Alloggiati =
   esecutore tecnico sotto le credenziali del gestore; Tassa = intermediario dichiarante ex Cass.
   SSUU 1527/2026; ISTAT = delega nativa Ross1000). L'host resta titolare. Attivo SOLO con gli **8
   safeguard non negoziabili:** (1) consenso granulare per-pilastro, versionato e revocabile;
   (2) DRY-RUN + Test-gate al go-live di OGNI account; (3) validazione pre-invio **bloccante** — vale
   "mai inventare": dati `INCOMPLETE` → NON invia, segnala l'azione esatta; (4) reconcile T+1 con
   alert dentro la finestra di ravvedimento; (5) outbox idempotente, `MAX_SEND_ATTEMPTS=5`;
   (6) audit trail immutabile (payload + ricevuta + versione delega); (7) credenziali SOLO nel
   `SecretsVault`; (8) wording legale per-pilastro rivisto da un legale prima di ogni promessa
   pubblica. **Circuit breaker: nel dubbio, Norma NON invia e segnala.**
   ⛔ **ECCEZIONE che resta decisione umana esplicita di Gianluca (classe CRITICAL): il PRIMISSIMO
   Send reale ad Alloggiati si fa su struttura/ospite reale del FOUNDER, presidiato, con verifica
   ricevuta T+1 — MAI sul primo cliente, MAI in autonomia.** I metodi `Test` del WS restano ok.
   La **garanzia** è commerciale **con cap** (min tra danno e 12 mesi di canone, esclusi dati
   falsi/colpa host), **MAI una polizza** (sanzioni inassicurabili, art. 12 Cod. Ass.); la
   responsabilità penale ex art. 109/17 TULPS è **incedibile**.
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

## Stack AI disponibile (globale — integrato 2026-06-18, vedi ~/.claude/STACK.md)

Complementare al setup di questo repo (guard hook `scripts/hooks/guard.sh`, comandi flotta daily-ops/night-run/ship-unit). Da Claude Code/Cursor sono disponibili:

- **Slash command globali**: `/ship` (pre-PR gate: typecheck+lint+test+rischio), `/risk` (classe LOW/MEDIUM/HIGH/CRITICAL), `/code-review`, `/stack-status`, `/eod`.
- **Subagent**: `pr-reviewer` (applica le classi di rischio del kernel), `test-runner` (CI locale → rossi), `kernel-guardian` (aderenza kernel), `repo-cartographer`.
- **Workflow** in `.claude/workflows/` (invoca con scriptPath): `code-review.mjs` (review diff multi-dimensione + verifica avversariale) · `dual-judge.mjs` (Claude+Gemini sulle decisioni dibattibili).
- **Multi-cervello**: `~/.claude/bin/gemini-ask.sh "domanda"` per un secondo parere; `dual-judge` per consenso/divergenza su scelte critiche.
- **MCP** (14 connettori): github, filesystem, context7, playwright, Linear, Notion, Slack, Apollo, n8n…

Per norma il rischio resta sovrano: billing/auth/schema/PII = HIGH+, invii reali = CRITICAL (sempre umano).
