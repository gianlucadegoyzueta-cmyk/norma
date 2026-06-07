# NIGHT-LOG — corsa autonoma NORMA

> Append-only. In cima il riepilogo onesto; sotto, una riga per unità.
> Modello operativo: lavoro a sessione (non demone 6h). Spedisco in prod SOLO unità
> sicure, reversibili e SENZA migrazioni. Le feature con schema sono parcheggiate
> in NEEDS-HUMAN con migrazione generata ma NON applicata (niente backup garantito sul DB prod).

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
