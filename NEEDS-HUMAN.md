# NEEDS-HUMAN — parcheggiati (richiedono un'azione umana sicura)

> Qui finisce SOLO ciò che non posso portare online in sicurezza in autonomia:
> migrazioni su DB di produzione (serve backup garantito), segreti/accessi che non ho,
> o unità rollbackate. Ognuna ha lo stato e cosa serve da te.

## Perché molte feature sono qui

Tutte le feature che cambiano lo schema del DB richiedono una migrazione su Supabase di
produzione. Non applico migrazioni in prod senza un backup/restore garantito (vedi DECISIONS D0).
Per ognuna lascio: codice su branch + PR, test verdi, e la migrazione **generata** (file SQL) ma
**non applicata**. Per attivarle: fai un backup del DB, poi `prisma migrate deploy` (o il workflow
migrate.yml già presente, che gira al merge su main).

---

## Parcheggiate

### 1. ISTAT — presenze turistiche per-regione

- **Perché è qui:** richiede campi di **residenza/provenienza** su `Guest` (oggi il modello ha solo nascita + cittadinanza, vedi censimento) → migrazione schema. Inoltre nuovo modello per le dichiarazioni ISTAT e tabelle di aggregazione mensile.
- **Cosa serve da te:** backup DB Supabase, poi applicare la migrazione generata. Decisione di prodotto: i portali ISTAT sono **regionali ed eterogenei** (Ross1000, WebTur, Sinfonia, Turismatica…) — l'invio reale per-regione va confermato per i comuni coperti (partenza Roma → Lazio/Ross1000).
- **Stato:** non iniziato in codice (parcheggiato a monte per il vincolo schema).

### 2. Check-in ospite self-service (link pubblico, multilingua IT/EN/DE/FR/ES, GDPR)

- **Perché è qui:** richiede (a) un token/record pubblico per soggiorno (nuovo modello → schema), (b) i campi residenza su `Guest` (condivisi con ISTAT), (c) infrastruttura i18n (oggi **assente**: nessun next-intl/i18next, stringhe IT hardcoded).
- **Cosa serve da te:** backup DB + migrazione. Scelta lib i18n consigliata: `next-intl` (App Router-native).
- **Stato:** non iniziato (vincolo schema + i18n da introdurre).

### 3. Import iCal prenotazioni (port ReservationSource)

- **Perché è qui:** nuovo modello `Reservation`/`ImportSource` (oggi inesistente) → schema.
- **Cosa serve da te:** backup DB + migrazione.

### 4. Backend hardening — stato `NEEDS_REVIEW` + omonimi

- **Perché è qui:** aggiungere `NEEDS_REVIEW` all'enum `SchedinaStatus` è un cambio di schema. Serve per parcheggiare gli **omonimi** (la riconciliazione T+1 matcha su cognome+nome+data nascita senza documento → due omonimi nello stesso batch possono collidere).
- **Cosa serve da te:** backup DB + migrazione enum.
- **NB non-schema già fattibile (lo farò se resta tempo / oppure tu):** il **cap max-attempts=5** e il guard sul doppio-incremento di `attempts` NON richiedono schema (logica in `outbox.service.ts`/repo) → spedibile a parte.

### 5. Scheduler invio + reconcile T+1

- **Perché è qui (parzialmente):** un Vercel Cron + route API NON richiede schema, ma **abilitare l'invio automatico reale verso la Questura in autonomia notturna è rischioso** (il primo invio reale "solo su ospite vero, mai come prova" — vincolo del brief). Va acceso da te, consapevolmente.
- **Cosa serve da te:** decidere quando attivarlo; io posso lasciare la route+cron **disattivati** su un branch.

### 6. Gate #0 — diagnostico PDF Ricevuta (live) + parser PDF reale — ✅ RISOLTO (2026-06-10)

- **Esito:** Gate #0 eseguito con credenziali reali. Autenticazione e canale SOAP verificati. Ricevuta reale del 2026-03-25 scaricata: è un documento AGGREGATO senza nominativi ospiti (vedi DECISIONS D3). Parser reale implementato (`ricevuta-summary.ts` + `ricevuta-pdf-text.ts`), 11 test verdi.
- **Follow-up aperto:** redesign della riconciliazione T+1 per CONTEGGIO (al posto del match per-identità) — non richiede schema.

#### (storico) 6. Gate #0 — diagnostico PDF Ricevuta (live) + parser PDF reale

- **Perché è qui:** richiede **credenziali Alloggiati di test reali** nel `.env` e una **chiamata SOAP live** alla Questura → segreto/accesso che non ho e azione verso un sistema esterno reale. Il parser del PDF reale dipende dall'output del Gate #0.
- **Cosa serve da te:** eseguire `npm run alloggiati:gate0-pdf` con le credenziali test, incollarmi il verdetto/diagnostica → poi implemento il parser reale e applico il verdetto al finding #1.

### 7. Tassa di soggiorno — export PDF

- **Perché è qui:** NON ha schema, è additivo (libreria PDF). **Spedibile**, ma lo lascio come PR per revisione visiva (il layout del PDF è estetica che non posso vedere). Se lo trovi in PR aperta, è questo.
