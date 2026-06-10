# Corsia C — Quality gate + rifiniture (zero schema, zero invii)

**Obiettivo:** alzare il pavimento di qualità così le prossime corse notturne possono
mergiare con più fiducia. SOLO unità reversibili senza migrazioni.

## Unità in ordine di priorità

1. **E2E smoke con Playwright** (il quality gate che manca):
   - `@playwright/test` devDependency; suite minima: home marketing carica? NO (repo
     separato) — solo app: /login renderizza, signup form valida, /api/health 200,
     /dashboard redirige a login da anonimo, pagina pubblica /checkin/[token] con token
     finto → 404 pulito.
   - Job CI separato `e2e` in ci.yml: build + `next start` + playwright contro localhost.
     DEVE restare sotto i 5 minuti. Niente browser pesanti extra: solo chromium.
2. **PDF tassa di soggiorno** (NEEDS-HUMAN #7, è additivo): export PDF del report
   trimestrale con pdf-lib (già dipendenza). Layout sobrio carta&inchiostro. PR APERTA,
   NON mergiare: review visiva umana richiesta.
3. **Accessibilità e copy**: passa le pagine nuove (istat, checkin, credentials) con
   l'occhio a11y (label, focus, aria) e uniforma il copy italiano (tono Norma).
4. Se avanza tempo: riduci `any` residui, dead code, TODO stantii (elenca, non stravolgere).

## Vincoli

- NON toccare: prisma/, src/server/modules/alloggiati/ (corsia A/B ci lavorano altrove,
  e gli invii sono congelati). Se un fix lo richiede, annotalo in NIGHT-LOG e salta.
- package.json: aggiungi SOLO @playwright/test. Rebase su main prima della PR finale
  (le altre corsie toccano package-lock).

## Definition of done

Suite e2e verde in CI · PR mergiate (tranne PDF: aperta per review) · NIGHT-LOG aggiornato.
