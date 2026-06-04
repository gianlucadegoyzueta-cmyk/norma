# NIGHT-LOG — corsa autonoma NORMA

> Append-only. In cima il riepilogo onesto; sotto, una riga per unità.
> Modello operativo: lavoro a sessione (non demone 6h). Spedisco in prod SOLO unità
> sicure, reversibili e SENZA migrazioni. Le feature con schema sono parcheggiate
> in NEEDS-HUMAN con migrazione generata ma NON applicata (niente backup garantito sul DB prod).

## RIEPILOGO (aggiornato in corso)

- **Online in prod (mergiato + health-check verde):**
  - PR #26 — a11y combobox (`role="presentation"`) + **CIN nelle dichiarazioni tassa** + log notturni. (main `6d2102f`)
  - PR #27 — `/api/health` reso pubblico (endpoint di monitoraggio raggiungibile). _(in deploy)_
- **PR aperte per REVISIONE VISIVA (non mergiate apposta — non posso vedere la UI renderizzata):** _(design/dashboard, se prodotte)_
- **Parcheggiate (NEEDS-HUMAN):** tutte le feature con schema DB — ISTAT, check-in self-service, campi residenza Guest, stato NEEDS_REVIEW, import iCal, scheduler invio/reconcile, Gate #0 live. Vedi NEEDS-HUMAN.md.
- **Rollback:** nessuno.
- **Ultimo commit sano di main:** aggiornato ad ogni merge (vedi unità). Partenza `68c556c` → `6d2102f` (#26) → #27.
- **Prima azione consigliata al risveglio:** (1) rivedere visivamente le PR di design lasciate aperte e mergiarle se piacciono; (2) per le feature parcheggiate, fare un backup del DB Supabase e applicare le migrazioni generate (il workflow `migrate.yml` gira al merge su main).

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
- **CI locale:** _(sotto)_ · **ONLINE:** _(in corso)_
