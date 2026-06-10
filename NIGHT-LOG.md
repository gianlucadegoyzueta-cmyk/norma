# NIGHT-LOG — corsa autonoma NORMA

> Append-only. In cima il riepilogo onesto; sotto, una riga per unità.
> Modello operativo: lavoro a sessione (non demone 6h). Spedisco in prod SOLO unità
> sicure, reversibili e SENZA migrazioni. Le feature con schema sono parcheggiate
> in NEEDS-HUMAN con migrazione generata ma NON applicata (niente backup garantito sul DB prod).

## SESSIONE 2026-06-10 (notte) — reconcile per conteggio + scheduler disattivato

**Online (mergiato + CI verde + health-check):**

- **PR #55** — **riconciliazione T+1 PER CONTEGGIO** (verdetto Gate #0, DECISIONS D3→**D4**). La Ricevuta è AGGREGATA: niente match per-identità, si confronta il numero di schedine `UNVERIFIED` del giorno con `SCHEDINE INVIATE` della ricevuta. Esiti: pari→`ACQUIRED`; ricevuta vuota/assente→`PENDING` (re-inviabili, no doppione); diverse→**l'intero batch in `NEEDS_REVIEW`**. Nuovo port `RicevutaSummaryReader` + adapter `SoapRicevutaSummaryReader`; nuova transizione `UNVERIFIED→NEEDS_REVIEW`. **Nessuna migrazione** (enum/colonne già in schema da PR #51). Test: 358 verdi (reconcile per conteggio riscritto, adapter su PDF VERO via pdf-lib, transizione). ✅ main `a9f4736`.
- **PR #57** — **chore CI**: `migrate.yml` allineato a `actions/checkout@v6` + `setup-node@v6` (ci.yml era già su v6). Rende ridondanti le dependabot #32/#33. ✅ main `5cc9237`.

**Pronto in PR, NON mergiato (decisione tua):**

- **PR #56** — **scheduler invio+reconcile DISATTIVATO di default**. `GET /api/cron/alloggiati` con due barriere (`domain/cron-gate.ts`): flag `ALLOGGIATI_CRON_ENABLED` OFF di default → 200 `{disabled:true}`; anche da attivo solo cron Vercel autenticato (`Bearer $CRON_SECRET`, fail-closed). Orchestrazione testabile `runSendAndReconcile` (resiliente per-credenziale). `vercel.cron.example.json` per accenderlo. CI verde. **NON mergiata apposta** (guardrail #1: l'invio reale non si accende in autonomia). Dettaglio per accenderlo in NEEDS-HUMAN #5.

**Health-check (prod):** `/login` `/signup` `/api/health` = 200, `/dashboard` = 307 (gated), `norma.casa` = 200. `/api/cron/alloggiati` = 307 (atteso: la route è solo in PR #56, non ancora in prod). App sana.

**Guardrail rispettati:** nessun Send reale, nessuna migrazione (zero file di migrazione aggiunti → migrate.yml resta no-op), nessuna cancellazione, niente push su main (tutto via PR+CI verde). Rollback: nessuno.

**Prima azione consigliata al risveglio:** decidere su PR #56 (scheduler) — prima un primo invio reale manuale su ospite vero, poi eventualmente accendere il cron via env.

---

## RIEPILOGO ONESTO (fine sessione)

**Cosa è ANDATO ONLINE (mergiato + health-check verde, in produzione su app.norma.casa):**

- **PR #26** — fix a11y combobox (`role="presentation"`) + **CIN agganciato all'export delle dichiarazioni tassa** (nuova colonna CIN nel CSV) + log notturni. (main `6d2102f`)
- **PR #27** — `/api/health` reso pubblico: ora risponde `{"status":"ok",...}` 200 (prima 307→login). Verificato live. (main `db43b2b`)
- **PR #29** — backend hardening: **cap max-tentativi=5** sull'outbox (niente retry runaway) + **guard sul doppio-incremento** di `attempts` (ora solo `claimForSending` lo incrementa). Non-schema, 3 test nuovi. ✅ online (main `26cb3d7`, health-check verde).
- **PR #31** — **logo ufficiale Norma in tutta l'app**: il marchio reale (sigillo-monogramma `SealMark` terracotta) + "Norma" in Fraunces sostituisce il generico ShieldCheck in tutti i 7 punti; aggiunto **favicon** `app/icon.svg` (reso pubblico in paths). ✅ online (main `f19b554`, `/icon.svg`=200, health-check verde).
- **norma-marketing PR #2** (repo separato) — **palette terracotta unica su tutta la landing** (la home era indaco/blu) + logo ufficiale in header/footer. ✅ online su **norma.casa** (main marketing `661e682`).
- **PR #38** — **rimosso il magic link** (accesso solo email+password con reset + Google). Tolto provider Nodemailer, action `sendMagicLink`, tab UI e route `/auth/check-email`. Reset password invariato (canale email dedicato). Verificato live: `/login` senza "Magic link", `/auth/check-email`=404, form password ok. ✅ online (main `3872d28`).
- **PR #37** — dashboard "a colpo d'occhio" (riga metriche): **PR aperta, NON mergiata** — è visiva, attende revisione su preview Vercel.
- **PR #35** — **export PDF della dichiarazione tassa di soggiorno** (accanto al CSV): `toDeclarationPdf` via pdf-lib (puro JS), documento A4 brandizzato con tabella Struttura/CIN/Notti/Imposta + totale, paginazione; bottone "Esporta PDF" in `/tourist-tax`. Non-schema, additivo, 3 test. ✅ online (main `b681272`, health-check verde).

Health-check OK: `/login` `/signup` `/api/health` `/icon.svg` = 200, `/dashboard` = 307 (gated), `norma.casa` = 200.

**Cosa NON ho fatto e perché (onesto):**

- **Brand: FATTO e online** (logo ufficiale ovunque nell'app + palette terracotta unica su tutta la landing marketing). **Dashboard "centro compliance" e restyle premium delle singole schermate**: NON ancora fatti — vanno fatti con revisione visiva (localhost/preview) prima del prod.
- **Tutte le feature con schema DB** (ISTAT, check-in self-service, residenza Guest, NEEDS_REVIEW, iCal, scheduler) → parcheggiate (no migrazioni prod senza backup garantito). Dettaglio e cosa serve da te in `NEEDS-HUMAN.md`.
- **Non-schema rimasti:** nessuno di rilievo (l'export PDF tassa è stato fatto, #35).

**Rollback:** nessuno. **main sano e deployabile.** Catena: `68c556c` → `6d2102f` (#26) → `db43b2b` (#27) → #28 → `26cb3d7` (#29) → `f19b554` (#31 logo). Marketing main `661e682`.

> Nota incidente (risolto): un commit di log nel clone di lavoro `/tmp` si è corrotto (aveva inglobato `node_modules`); il **push è stato RIFIUTATO da GitHub**, quindi origin e produzione **non sono mai stati toccati**. Recuperato con un clone fresco. Nessun impatto su main/prod.

**Prima azione consigliata al risveglio:** decidere insieme la direzione del **design/dashboard** (te lo costruisco e te lo mostro in PR, lo mergi se ti piace), e — per le feature parcheggiate — fare un **backup del DB Supabase** così posso procedere con le migrazioni.

---

## UNITÀ

<!-- formato: ### [timestamp] Unità N — titolo | branch | commit | CI | health-check | ONLINE -->

### Unità 1+2 — a11y combobox + CIN nelle dichiarazioni tassa + setup log

- **Branch:** `chore/night-ops-and-a11y`
- **Cosa:** (1) fix a11y "gemello": il messaggio "Nessuna corrispondenza" in `combobox.tsx` ora è `role="presentation"` (non più `role="option"` fittizio), coerente con ComuneTypeahead. (2) CIN agganciato all'export dichiarazione: colonna CIN nel CSV, risolta per riga via `cinForDeclarationExport` (solo se conforme) — nessun cambio di schema. (3) inizializzati NIGHT-LOG/DECISIONS/NEEDS-HUMAN.
- **CI locale:** format ✓ · lint ✓ (0 errori) · typecheck ✓ · test 316 ✓ · build ✓
- **CI su PR #26:** verde (Lint·Typecheck·Test·Build + Vercel).
- **Health-check:** `/login` 200, `/signup` 200, `/auth/forgot` 200, `/dashboard` 307 (gated), `norma.casa` 200. App sana.
- **ONLINE:** ✅ sì — merge in main `6d2102f`.

### Unità 3 — `/api/health` pubblico

- **Branch:** `fix/health-public` → PR #27
- **Cosa:** aggiunto `/api/health` a `PUBLIC_EXACT` in `paths.ts`: l'endpoint di monitoraggio (status/uptime, nessun dato) ora risponde 200 anche senza sessione, invece di essere rediretto a /login. Scoperto durante l'health-check dell'unità 1+2. Test esteso.
- **CI su PR #27:** verde · **Health-check:** `/api/health` = 200 (`{"status":"ok"}`) verificato live · **ONLINE:** ✅ sì — main `db43b2b`

### Unità 4 — backend hardening: cap max-tentativi + guard attempts

- **Branch:** `feat/outbox-max-attempts` → PR #29
- **Cosa:** (1) `MAX_SEND_ATTEMPTS=5` (`domain/send-policy.ts`): `listPendingByCredential` esclude le schedine con `attempts ≥ 5` → non si ritentano più all'infinito, restano PENDING ma inerti (candidate a NEEDS_REVIEW, follow-up con schema). (2) Rimosso il doppio-incremento di `attempts`: ora solo `claimForSending` incrementa (la `transition()`→SENDING non tocca più `attempts`). InMemory repo ora traccia `attempts` (helper di test). 3 test nuovi.
- **CI locale:** format ✓ · lint ✓ (0 errori) · typecheck ✓ · test 319 ✓ · build ✓
- **CI su PR #29:** verde · **Health-check:** `/api/health`=200, `/login` `/signup`=200, `/dashboard`=307 · **ONLINE:** ✅ sì — main `26cb3d7`

### [2026-06-10] Unità 5 — riconciliazione T+1 per CONTEGGIO (D3 → D4)

- **Branch:** `feat/reconcile-by-count` → PR #55
- **Cosa:** redesign del reconcile dal match per-identità al confronto di CONTEGGIO (la Ricevuta è AGGREGATA, Gate #0). Nuovo port `RicevutaSummaryReader` + adapter `SoapRicevutaSummaryReader` (su `parseRicevutaSummaryPdfBase64`; `ERRORE_RECUPERO_RICEVUTA`→null). `SchedinaReconcileService` confronta `UNVERIFIED` del giorno vs `SCHEDINE INVIATE`: pari→`ACQUIRED` (MATCH); ricevuta vuota/assente→`PENDING` (NONE_SENT, re-inviabili); diverse→`NEEDS_REVIEW` per l'intero batch (MISMATCH). Nuova transizione `UNVERIFIED→NEEDS_REVIEW`. Wiring `reconcileCredentialAction` con messaggio per verdetto. **Nessuna migrazione** (enum/colonne già presenti). DECISIONS D4.
- **Conservativo:** auto-conferma SOLO a conteggi pari, auto-riaccoda SOLO a ricevuta vuota; ogni ambiguità → revisione umana (mai falso ACQUIRED né doppione).
- **CI locale:** format ✓ · lint ✓ (0 errori) · typecheck ✓ · test 358 ✓ · build ✓
- **CI su PR #55:** verde (Lint·Typecheck·Test·Build + Vercel) · **ONLINE:** ✅ sì — main `a9f4736`

### [2026-06-10] Unità 6 — scheduler invio+reconcile DISATTIVATO (NON mergiato)

- **Branch:** `feat/cron-send-reconcile` → PR #56 (**aperta, non mergiata apposta**)
- **Cosa:** `GET /api/cron/alloggiati` disattivato di default. Gating puro `domain/cron-gate.ts` (flag `ALLOGGIATI_CRON_ENABLED` + auth `Bearer $CRON_SECRET`, fail-closed). Orchestrazione testabile `runSendAndReconcile` (`services/cron-runner.ts`): per ogni credenziale attiva send poi reconcile, resiliente per-credenziale. `PrismaCredentialRepository.listActiveCredentialIds()`. Route resa pubblica in `paths.ts` (auth nella route, non sessione). `vercel.cron.example.json` con le istruzioni per accenderlo.
- **CI locale:** format ✓ · lint ✓ (0 errori) · typecheck ✓ · test 368 ✓ · build ✓ (route presente)
- **CI su PR #56:** verde · **ONLINE:** ❌ no, di proposito (decisione umana — vedi NEEDS-HUMAN #5)

### [2026-06-10] Unità 7 — chore CI: migrate.yml su actions v6

- **Branch:** `chore/migrate-yml-actions-v6` → PR #57
- **Cosa:** `migrate.yml` allineato a `actions/checkout@v6` + `actions/setup-node@v6` (ci.yml era già su v6 e verde). Solo file workflow, reversibile. Rende ridondanti le dependabot #32/#33.
- **CI su PR #57:** verde · **ONLINE:** ✅ sì — main `5cc9237`

### [2026-06-10] Corsia A (flotta) — Import iCal prenotazioni Airbnb/Booking/VRBO

- **Branch:** `feat/ical-import` → PR #65 (**mergiata**)
- **Cosa:** le prenotazioni entrano in Norma da sole. L'host incolla l'URL iCal del calendario della struttura e Norma crea/aggiorna i **soggiorni in bozza** (da completare con gli ospiti). Modulo nuovo `src/server/modules/reservations` (ports/adapters, domain puro).
  - **Dominio puro testato:** parser **RFC5545 scritto a mano** (`domain/ical.ts` — unfolding, DATE/DATE-TIME, unescape, filtro blocchi "non disponibile"); **niente dipendenze native** → gira su Vercel (valutato `node-ical`, scartato: troppo peso `rrule`/`moment-timezone` per VEVENT piatti). `domain/source.ts` (detect Airbnb/Booking/VRBO dall'host + validazione URL). `domain/reconcile.ts` — **dedup per UID iCal** + regole annullamento (puro, idempotente).
  - **Regole annullamento (da spec):** evento sparito dal feed → bozza ancora vergine = `CANCELLED`; bozza già **arricchita** con ospiti = `NEEDS_CANCEL_REVIEW` (si segnala, non si tocca). Evento ricomparso → riattivato a `DRAFT`.
  - **Adapter:** `ICalHttpFetcher` (fetch con timeout via AbortController, errori parlanti, guard `BEGIN:VCALENDAR`); repo Prisma + InMemory; `ReservationImportService` orchestrazione. Sync **manuale** ("Sincronizza ora") — **niente cron** (congelati, CLAUDE.md ⛔).
  - **UI:** nuova `/properties/[id]` (linkata dalla lista immobili): collega/rimuovi URL iCal, stato ultimo sync (mai/ok/errore), lista prenotazioni importate in bozza con badge stato.
- **Schema (corsia autorizzata alle migrazioni stanotte):** additivo-only. `model ReservationImport` + campi nullable su `Stay` (`icalUid`, `importSource`, `importStatus`, `reservationImportId`; FK `onDelete:SetNull`; unique `(reservationImportId, icalUid)`). Enum `ReservationSource`, `StayImportStatus`. Nessun drop/rename/alter. **Migrazione testata in locale** su Postgres (docker/colima): applica pulita. **Backup prod fresco** prima del merge (`backup.log` OK 2026-06-10 23:22).
- **CI locale:** format ✓ · lint ✓ (0 errori) · typecheck ✓ · test **390** ✓ (+34 nuovi: ical/reconcile/source/service) · build ✓ (route `/properties/[id]` presente).
- **CI su PR #65:** verde (Lint·Typecheck·Test·Build + Vercel) · **migrate.yml prod:** applicata con successo · **ONLINE:** ✅ sì — main `9cbd609`
