# NIGHT-LOG — corsa autonoma NORMA

> Append-only. In cima il riepilogo onesto; sotto, una riga per unità.
> Modello operativo: lavoro a sessione (non demone 6h). Spedisco in prod SOLO unità
> sicure, reversibili e SENZA migrazioni. Le feature con schema sono parcheggiate
> in NEEDS-HUMAN con migrazione generata ma NON applicata (niente backup garantito sul DB prod).

## RIEPILOGO (aggiornato in corso)

- **Online in prod:** _(in aggiornamento)_
- **Parcheggiate (NEEDS-HUMAN):** feature con schema DB (ISTAT, check-in self-service, campi residenza Guest, stato NEEDS_REVIEW, import iCal, Gate #0 live).
- **Rollback:** nessuno finora.
- **Ultimo commit sano di main:** `68c556c` (PR #25).
- **Prima azione consigliata al risveglio:** rivedere le PR/merge della notte su norma.casa; per le feature parcheggiate, fare un backup del DB Supabase e applicare le migrazioni generate.

---

## UNITÀ

<!-- formato: ### [timestamp] Unità N — titolo | branch | commit | CI | health-check | ONLINE -->

### Unità 1+2 — a11y combobox + CIN nelle dichiarazioni tassa + setup log

- **Branch:** `chore/night-ops-and-a11y`
- **Cosa:** (1) fix a11y "gemello": il messaggio "Nessuna corrispondenza" in `combobox.tsx` ora è `role="presentation"` (non più `role="option"` fittizio), coerente con ComuneTypeahead. (2) CIN agganciato all'export dichiarazione: colonna CIN nel CSV, risolta per riga via `cinForDeclarationExport` (solo se conforme) — nessun cambio di schema. (3) inizializzati NIGHT-LOG/DECISIONS/NEEDS-HUMAN.
- **CI locale:** format ✓ · lint ✓ (0 errori) · typecheck ✓ · test 316 ✓ · build ✓
- **Health-check:** _(post-deploy, sotto)_
- **ONLINE:** _(in corso)_
