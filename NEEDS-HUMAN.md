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

### 5. Scheduler invio + reconcile T+1 — ⏸️ CODICE PRONTO IN PR (disattivato), attende la TUA decisione

- **Stato:** route + cron **implementati e DISATTIVATI di default** in **PR #56** (`feat/cron-send-reconcile`), **NON mergiata** apposta. CI verde. Nessuno schema, nessun Send reale finché il flag è OFF.
- **Com'è fatto:** `GET /api/cron/alloggiati` con due barriere (`domain/cron-gate.ts`): (1) gira solo se env `ALLOGGIATI_CRON_ENABLED="true"`, altrimenti 200 `{disabled:true}`; (2) anche da attivo accetta solo il cron Vercel autenticato (`Authorization: Bearer $CRON_SECRET`, fail-closed). Orchestrazione testabile `runSendAndReconcile` (send poi reconcile per conteggio su ogni credenziale attiva, resiliente per-credenziale).
- **Cosa serve da te per accenderlo (consapevolmente):** (a) mergiare PR #56; (b) copiare il blocco `crons` da `vercel.cron.example.json` in un vero `vercel.json`; (c) su Vercel impostare `CRON_SECRET` e `ALLOGGIATI_CRON_ENABLED=true`. Prima conviene un primo invio reale manuale su ospite vero (guardrail #1).

### 6. Gate #0 — diagnostico PDF Ricevuta (live) + parser PDF reale — ✅ RISOLTO (2026-06-10)

- **Esito:** Gate #0 eseguito con credenziali reali. Autenticazione e canale SOAP verificati. Ricevuta reale del 2026-03-25 scaricata: è un documento AGGREGATO senza nominativi ospiti (vedi DECISIONS D3). Parser reale implementato (`ricevuta-summary.ts` + `ricevuta-pdf-text.ts`), 11 test verdi.
- **Follow-up:** ✅ RISOLTO — redesign della riconciliazione T+1 per CONTEGGIO mergiato (PR #55, main `a9f4736`, vedi DECISIONS D4). Niente più match per-identità.

#### (storico) 6. Gate #0 — diagnostico PDF Ricevuta (live) + parser PDF reale

- **Perché è qui:** richiede **credenziali Alloggiati di test reali** nel `.env` e una **chiamata SOAP live** alla Questura → segreto/accesso che non ho e azione verso un sistema esterno reale. Il parser del PDF reale dipende dall'output del Gate #0.
- **Cosa serve da te:** eseguire `npm run alloggiati:gate0-pdf` con le credenziali test, incollarmi il verdetto/diagnostica → poi implemento il parser reale e applico il verdetto al finding #1.

### 8. Billing Stripe (sandbox) — CODICE PRONTO IN PR, attende chiavi + migrazione

- **Perché è qui:** (a) introduce i modelli `Subscription` + `ProcessedStripeEvent` → migrazione schema; stanotte solo la corsia A è autorizzata a migrare, quindi la mia migrazione è **generata ma NON applicata**; (b) servono le chiavi Stripe (test mode) che non ho.
- **Stato:** modulo `src/server/modules/billing` completo (dominio puro + porte + adapter Stripe/Prisma/InMemory + servizi), pagina `/billing`, webhook `/api/webhooks/stripe`, script bootstrap. CI verde (format/lint/typecheck/test/build). **Nessuna tabella creata, nessuna chiave usata** → mergiabile così com'è.
- **Migrazione parcheggiata:** `prisma/migrations-parked/20260610000000_add_billing_subscription/` (NON sotto `prisma/migrations/`, così un `migrate deploy` accidentale non la applica). Lo schema Prisma è già aggiornato (per generare il client/i tipi). Finché la migrazione non è applicata, la pagina `/billing` mostra "Billing in attesa di attivazione" e degrada con grazia (P2021 intercettato).
- **Cosa serve da te (nell'ordine):**
  1. **Backup DB** (guardrail 2), poi spostare la cartella della migrazione sotto `prisma/migrations/` e `npm run db:deploy`. (Coordinare con la corsia A che migra stanotte, per evitare doppioni.)
  2. **Crea prodotti/prezzi su Stripe (test mode):** `STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/stripe-bootstrap.ts` — idempotente, crea Product "Norma" + price annuale €120/anno (`norma_annual_v1`) e mensile €14/mese (`norma_monthly_v1`).
  3. **Env (`.env` locale + Vercel, ambiente di test/preview):**
     - `STRIPE_SECRET_KEY=sk_test_...`
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` (predisposto; oggi non usato lato server, le pagine Checkout/Portal sono hosted)
     - `STRIPE_WEBHOOK_SECRET=whsec_...` (lo dà Stripe quando registri l'endpoint)
  4. **Registra il webhook** su Stripe → URL `https://<app>/api/webhooks/stripe`, eventi: `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed`. Per i test locali: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
- **Decisioni di prodotto già applicate (Piano Marketing):** annuale-first (€120/anno consigliato, €14/mese rampa); **trial legato al primo ospite gestito**, non a tempo (logica app-side `billing/domain/access.ts`, niente trial Stripe a giorni); grazia di 7 giorni dopo il primo ospite. NB: il sito dice ancora "€12/mese" — disallineamento noto, lo aggiorni tu.
- **Follow-up (non bloccante, NON l'ho fatto per non toccare i moduli di altre corsie):** cablare il guard `BillingGatingService.requireWriteAccess(orgId)` nelle server action di scrittura (schedine, stay, tax…) e il banner "abbonati" quando `state === "EXPIRED"`. Il guard e il gating sono già pronti e testati.

### 7. Tassa di soggiorno — export PDF

- **Perché è qui:** NON ha schema, è additivo (libreria PDF). **Spedibile**, ma lo lascio come PR per revisione visiva (il layout del PDF è estetica che non posso vedere). Se lo trovi in PR aperta, è questo.
