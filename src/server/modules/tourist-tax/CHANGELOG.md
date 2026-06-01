# Tassa di soggiorno — CHANGELOG e note operative

Modulo costruito in 4 fasi (un commit per fase), stile esagonale come `alloggiati`.
Dominio PURO e massimamente testato; effetti (DB) dietro port/adapter. Denaro sempre in centesimi.
NON tocca il modulo alloggiati. Isolamento multi-tenant (`organizationId`) in tutte le query.

## Fasi (commit su branch `feat/tourist-tax`, base `dc5829f`)

- **Fase 1 — schema regole tipizzato + calcolatore puro** (`40bcab7`)
  - `domain/rule.ts`: tipo `TouristTaxRule` (sostituisce `rules: Json` libero) + `parseTouristTaxRule`
    (validazione esplicita, nessuna dipendenza). Modello `PER_PERSON_PER_NIGHT`.
  - `domain/calculator.ts`: `computeTouristTax(stay, guests, rule)` — per ospite × notte ≤ nightCap,
    risolve tariffa (categoria/zona/stagione), applica età (alla data del soggiorno) + esenzioni,
    somma, aggiunge surcharge. Output: totale in centesimi + dettaglio per ospite.

- **Fase 2 — persistenza versionata + selezione per data + seed** (`c0893ae`)
  - **FIX SCHEMA**: `TouristTaxConfig.comuneId` non più `@unique` → `@@unique([comuneId, validFrom])`
    (+ `@@index`, relazione `Comune` 1:N). Le tariffe si versionano nel tempo.
  - `domain/version-select.ts`: `selectVersionAt()` (validFrom inclusivo, validTo esclusivo, gap→null).
  - Port + adapter Prisma config; `prisma/seed-tourist-tax.ts` idempotente (4 comuni).

- **Fase 3 — stima nella scheda soggiorno** (`299ed7b`)
  - `services/estimate.service.ts` (ponte DB→calcolatore, esito `NO_RULE`) + UI `TouristTaxCard`
    nella scheda soggiorno (query Prisma dedicata, isolata per org, senza accoppiare `stays`).

- **Fase 4 — dichiarazione periodica + export + versamento** (`3f9c2a1`)
  - Macchina a stati `DRAFT→READY→SUBMITTED→PAID` (+`CANCELLED`); periodi MONTHLY/QUARTERLY/ANNUAL;
    aggregazione per comune+periodo; export CSV; pagina `/tourist-tax` con versamento selezionabile.

## Reale vs Stub

| Componente                                       | Stato                                                                                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Calcolatore + regole tipizzate                   | **REALE**, testato                                                                                                                 |
| Selezione versione per data                      | **REALE**, testato                                                                                                                 |
| Persistenza config/dichiarazioni (Prisma)        | **REALE**                                                                                                                          |
| Stima per soggiorno (UI)                         | **REALE**                                                                                                                          |
| Dichiarazione periodica + stati + export **CSV** | **REALE**                                                                                                                          |
| Export **PDF**                                   | **NON implementato** in v1 (CSV soddisfa l'export; PDF predisponibile)                                                             |
| Versamento **MANUAL_EXPORT**                     | **REALE** (scarica il CSV)                                                                                                         |
| Versamento **GECOS / pagoPA / portale comunale** | **STUB** (`isImplemented=false`): port `RemittanceChannel` predisposto, ricaduta automatica su export manuale finché non integrati |

Totale test del modulo: **62** (calculator 30, version-select 8, estimate 7, declaration-domain 10,
declaration.service 7). `tsc` pulito, `eslint` pulito dopo ogni fase.

## ⚠️ Migrazione Prisma — GENERATA, NON APPLICATA

`prisma/migrations/20260531190000_tourist_tax_module/migration.sql` — generata con
`prisma migrate diff` (schema→schema, **nessun DB toccato**), inclusa nel commit di Fase 2.
Applicarla quando si decide: `npx prisma migrate deploy` (o `dev`). Contiene: drop
`TouristTaxConfig_comuneId_key`, nuovo unique `(comuneId, validFrom)`, colonne
`Property.accommodationCategory/touristTaxZone`, `Guest.taxExemptionType`, enum
`TaxDeclarationStatus`/`TaxRemittanceMode`, tabella `TouristTaxDeclarationLine`.
Dopo l'applicazione: `npx tsx prisma/seed-tourist-tax.ts` (seed regole).

## ⚠️ Regole da RICONFERMARE sui regolamenti comunali ufficiali (prima del go-live)

Il seed (`domain/seed-data.ts`) è un **punto di partenza** datato 2026-05-31, non una fonte legale.

- **Roma**: 6 €/notte, tetto 10/anno, esente <10, surcharge Giubileo +2€. `dueDay` GECOS da riconfermare.
- **Firenze**: 6 €/notte (dal 2025-02-01), tetto 7, esente <12, mensile.
- **Milano**: 6,30 €/notte (2025), tetto 14, esente <18.
- **Venezia**: ⚠️ **IMPORTI SEGNAPOSTO** (`amountsToReconfirm: true`) — delibera C.C. 77/2024
  (01/04/2025) ha cambiato regime; zone/stagionalità presenti ma i valori (500/350/400 c) vanno
  sostituiti con quelli ufficiali. Fascia 10–16 al 50% confermata strutturalmente.

## Assunzioni di calcolo (documentate, da validare col business)

- Età valutata all'**inizio** del soggiorno (chi compie gli anni durante resta nella fascia d'arrivo).
- Riduzione parziale (es. 50%) riduce **solo la base**; la surcharge è aggiunta intera.
- Esenzione piena (per tipo o età 100%) azzera base **e** surcharge.
- `nightCap` applicato alle notti **del soggiorno**. L'accumulo cross-soggiorno nell'anno solare
  (es. Roma "10 notti nell'anno") richiede lo storico e **non** è calcolato in v1 (segnalato in `notes`).
- Dichiarazione: un soggiorno appartiene al periodo se la **data d'arrivo** ci ricade (no split a cavallo).
- Soggiorni senza regola per il comune/data: **esclusi** dal totale (mai importi inventati),
  segnalati come `NO_RULE`/`skippedNoRule`.

## Nota ambiente

Il modulo è stato sviluppato in un **git worktree isolato** (`/private/tmp/norma-tax-wt`, fuori da
iCloud) con `npm ci` dedicato, per non collidere con un'altra sessione che lavorava sull'autenticazione
nello stesso repo. Da mergiare in `main` quando entrambe le linee sono pronte.
