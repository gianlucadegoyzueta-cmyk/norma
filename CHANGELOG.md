# Changelog — Norma (app compliance)

Storico consolidato delle release in produzione (`app.norma.casa`). Formato ispirato a
[Keep a Changelog](https://keepachangelog.com/it/). Le date sono di merge in `main`.
I changelog di dettaglio per feature storiche restano nei file `CHANGELOG-*.md`.

## 2026-06-07

### Aggiunto

- **Residenza ospite (provenienza)** — nuovi campi `Guest.residenceCountryId` / `residenceComuneId`
  (nullable, additivi) e relativa cattura facoltativa nel form ospite. Fondamenta per ISTAT e
  check-in; non alterano il tracciato Alloggiati (basato sulla nascita). (#40 schema, #41 form)
- **Dashboard "a colpo d'occhio"** — riga di metriche (schedine da gestire, immobili, soggiorni,
  tassa da inviare) in cima alla dashboard, ognuna linkata. Solo letture aggregate. (#37)
- **Export PDF della dichiarazione tassa di soggiorno** — accanto al CSV, via `pdf-lib`; documento
  A4 brandizzato con tabella Struttura/CIN/Notti/Imposta e totale, con paginazione. (#35)
- **Logo ufficiale + favicon** — marchio "sigillo-monogramma" terracotta + wordmark Fraunces in
  tutta l'app; favicon `icon.svg`. (#31)

### Modificato

- **Accesso semplificato: rimosso il magic link.** Restano email+password (con reset) e Google.
  Reset password invariato (canale email dedicato). Rimossa la route `/auth/check-email`. (#38)
- **Outbox più robusto** — cap a 5 tentativi di invio (stop al retry runaway) e fix del
  doppio-incremento di `attempts` (ora di sola competenza del claim). (#29)

### Corretto

- **`/api/health` pubblico** — l'endpoint di monitoraggio risponde 200 anche senza sessione. (#27)
- **CIN nell'export tassa** — colonna CIN nel CSV della dichiarazione (per immobile, se conforme);
  refuso "Generale→Genera"; bordo rosso sugli input in errore (`aria-invalid`); alert chiaro sul
  Comune mancante in onboarding; icona nello stato vuoto "Ospiti"; fix a11y combobox. (#26, #25)

## Precedente (fondazione)

- Autenticazione (email+password, reset, Google), modello multi-tenant, vault credenziali cifrato,
  modulo **Alloggiati** (token, validazione, invio, riconciliazione T+1), **soggiorni/ospiti/schedine**,
  **tassa di soggiorno** (dichiarazioni + export CSV), **CIN**, onboarding guidato, palette di brand
  terracotta + Fraunces. Dettagli nei `CHANGELOG-*.md` per feature.
