# Modulo CIN — CHANGELOG di lavoro

Branch: `feat/cin`. NORMA è system-of-record del CIN (inserimento manuale post-BDSR).

---

## Commit 1 — Dominio + schema

- `src/server/modules/cin/domain/cin.ts`: validazione strutturale (IT + alfanumerico, 12–17), compliance helpers, `cinForDeclarationExport` predisposto per merge con `feat/tourist-tax`.
- Enum `CinStatus` + campi `Property.cin` / `Property.cinStatus` (default `PENDING`).
- Migrazione `20260531120000_add_cin_to_property` (generata, non applicata).

**Nota post-migrazione:** tutti gli immobili esistenti → `PENDING` → alert "senza CIN" dal giorno 1. Comportamento atteso.

**TODO:** confermare lunghezza/classificazione esatte sulla doc ufficiale Ministero del Turismo.

---

## Commit 2 — Persistenza

- `CinService` + `CinRepository` (Prisma + InMemory).
- `saveCin` (valida + normalizza + `OBTAINED`), `markNotRequired`.

---

## Commit 3 — Alert compliance

- Dashboard: card warning se `propertyNeedsCin` > 0 → link a `/properties`.

---

## Commit 4 — UI inline

- `CinInlineForm` su ogni scheda immobile: input CIN, link BDSR, "Non richiesto".
- Badge "Senza CIN" in listing.

---

## Commit 5 — Port verifier (stub)

- `CinVerifier` + `StubCinVerifier`: nessuna chiamata di rete (no auto-richiesta Ministero).

---

## Merge con altri branch

- **`feat/tourist-tax`:** collisione additiva su `Property` — unire campi CIN + campi tassa, migrazione consolidata al merge.
- **`feat/auth-onboarding`:** indipendente; merge prima di CIN nella sequenza pianificata.
