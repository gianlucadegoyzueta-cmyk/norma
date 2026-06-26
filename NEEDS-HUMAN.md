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

## RISOLTO — #105 (app-redesign) mergiato con OPZIONE A

### 0. ✅ #105 + feature Support-AI + migrazione `add_support_tickets` — in prod su `main`

- **Decisione presa (opzione A):** #105 è stato mergiato su `main` **tenendo** la feature
  assistente-AI host-facing che portava con sé. Oggi su `main` (in prod) esistono: route
  `/api/support/chat`, pagina `/support`, `SupportChat`, modulo `src/server/modules/support/*`
  (incl. `PrismaTicketStore`) **e** la migrazione `prisma/migrations/20260620111627_add_support_tickets`
  (`model SupportTicket`), già applicata. Niente più decisione pendente: la B (scorporo) **non**
  è stata scelta.
- **Nota storica:** la raccomandazione iniziale era la B (mantenere #105 presentazione-pura). È
  stata superata dalla scelta di tenere tutto in A. Se in futuro si vuole rimuovere la feature
  support-AI, è un intervento separato e tracciabile (rimuovere `src/app/support`,
  `src/app/api/support`, `src/server/modules/support`, voce NAV/sidebar `/support` + migrazione
  di drop con backup).

---

## Parcheggiate

### ~~2. Check-in ospite self-service~~ — ✅ RISOLTO (in prod, #158+)

- Link pubblico `/checkin/[token]`, multilingua IT/EN/DE/FR/ES, bozza offline (#164), scanner MRZ (#161).

### ~~3. Import iCal prenotazioni~~ — ✅ RISOLTO (in prod, #65/#158)

- Modulo `stays` + `ReservationImport`; import con stati DRAFT/CANCELLED/NEEDS_CANCEL_REVIEW.

### ~~4. Backend hardening — NEEDS_REVIEW enum~~ — ✅ RISOLTO (schema in prod)

- Enum `NEEDS_REVIEW` presente; cap `MAX_SEND_ATTEMPTS=5` attivo (DECISIONS D2).

### 1. ISTAT — invio regionale reale (oltre export file)

- **Perché è qui:** export file Puglia/Umbria in prod (#158); **invio reale** ai portali regionali (Lazio first) resta gate umano CRITICAL.
- **Stato:** serializer + client pronti dove coperti; trasmissione gated fino a decisione founder. — ⏸️ CODICE PRONTO IN PR (disattivato), attende la TUA decisione

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

### 9. Movimento turistico — copertura nazionale (nuove regioni)

- **Stato codice (`feat/movimento-turistico-nuove-regioni` → mergiato su `main`):** copertura portata da 13 a **15 regioni FILE + serializer Sicilia pronto**.
  - ✅ **Puglia** (SPOT, XML) — FILE end-to-end (serializer + loader + dispatch reminder) **+ download dalla schermata `/istat`** (#158): nuova `exportSpotXmlAction`.
  - ✅ **Umbria** (Turismatica C59, .txt fixed-width, 1 file/giorno) — FILE end-to-end **+ download `/istat`** (#158): `exportUmbriaC59Action` impacchetta i file giornalieri in un solo ZIP (encoder puro STORE, zero dipendenze). Tabella codici provenienze trascritta dal PDF ufficiale.
  - ✅ **Sicilia** (WebAPI PMS) — body XML serializzato e testato; **trasmissione NON attiva** (è un'API: client + invio reale gated; vault credenziali §9b).
- **Cosa serve da te — azioni di sblocco (bozze pronte in `tmp/outreach/email-sblocco-regioni.md`):**
  1. **Campania** (Web API Sinfonia): email a giuseppe.pezone@regione.campania.it → Swagger + utenze test. Senza spec non scrivo il client.
  2. **Sicilia** (attivazione): PEC a servizioturistico.ct@certmail.regione.sicilia.it → credenziali UTENTE PMS. Poi: conferma codifica **Gender 1/2** con l'ente (il PDF è incoerente), e **primo invio reale solo con tua decisione** (guardrail #1).
  3. **Valle d'Aosta** (VIT): accreditamento fornitore PMS presso RAVDA/INVA → spec server-to-server.
  4. **Friuli-VG** (WebTur): richiesta tracciato file a Insiel.
  5. **PA Trento** (STU/DTU): PEC ISPAT per modulo Software House + tracciato C59 (canale file importabile; per affitti brevi serve DTU/CIPAT).
- **Decisione tua — Bolzano (PA):** TIC-Web/LTS richiede **certificazione software** obbligatoria (barriera vera, spec non pubblica). Vale per una sola provincia? Se sì, primo passo: contatto LTS (info@lts.it). Altrimenti resta ASSISTITO.
- **Follow-up minore:** verificare le regioni Ross1000 a confidenza media nel routing (Toscana, Lombardia web-service, Abruzzo) — già FILE, solo conferma sul campo.

#### 9b. Trasmissione AUTO (Sicilia) — infrastruttura pronta, vault credenziali da attivare

- **Stato codice (CI verde):** la catena AUTO Sicilia è completa e testata: `sicilia/report.ts` (dati→payload), `sicilia/tracciato-xml.ts` (body), `sicilia/pms-client.ts` (HTTP, transport iniettabile), `sicilia/transport.ts` (fetch reale), `sicilia/transmit.ts` (orchestrazione con **gate a tripla barriera**: flag globale + opt-in struttura + conferma esplicita; default CHIUSO). L'astrazione credenziali è in `regional/credentials.ts` (porta + provider in-memory).
- **PARCHEGGIATO — schema vault credenziali regionali (HIGH, serve tuo backup):** manca il modello DB per custodire le credenziali del CLIENTE per-struttura. Da aggiungere a `prisma/schema.prisma` (sul modello di `AlloggiatiCredential`):
  - `model RegionalCredential { id, organizationId, propertyId?, serializerId (es. "turistat-xml"), label, status (ACTIVE|PENDING|DISABLED), autoTransmit Boolean @default(false), secretRef @unique (→ SecretsVault, mai in chiaro), config Json? (dati non segreti, es. hotelCode Sicilia), lastVerifiedAt, createdAt, updatedAt }` + back-relation su Organization e Property + enum `RegionalCredentialStatus`.
  - Estendere `SecretsVault` con metodi generici (storeRaw/retrieveRaw) per segreti non-Alloggiati, + provider Prisma `PrismaRegionalCredentialProvider` (legge `RegionalCredential` + vault, degrada con grazia su P2021 se la tabella non esiste).
  - **Attivazione (tuo ordine):** backup DB (guardrail 2) → genera/applica la migrazione → UI per far inserire al cliente le sue credenziali regionali + opt-in `autoTransmit`.
- **Attivazione invio reale Sicilia (CRITICAL — guardrail #1):** solo dopo credenziali UTENTE PMS reali del cliente, conferma codifica **Gender 1/2** con l'ente, e tua decisione esplicita sul primo invio. Il gate `SICILIA_TRANSMIT_ENABLED` resta OFF finché non lo accendi tu.
- **Adapter futuri (stesso stampo, quando arriva la spec):** Campania (API), VdA, FVG, Trento — si innestano implementando un client + un provider credenziali, riusando `transmit.ts`/`credentials.ts`.

#### 9c. Assunzioni note (dalla review avversariale — low, da decidere consapevolmente)

- **`occupazionepostoletto` = "si" per tutti (SPOT):** Norma non raccoglie il dato → default conservativo. Gonfia leggermente l'occupazione posti letto per famiglie con bambini co-dormienti. Se serve precisione, raccogliere il dato; altrimenti è uno scostamento noto dalla disciplina "mai inventare" (qui un default, non un INCOMPLETE).
- **Giorno-calendario in UTC (ISTAT) vs Europe/Rome (Alloggiati/CSV):** i moduli ISTAT (ross1000/spot/umbria) bucketizzano i giorni in UTC; assumono `arrivalDate/departureDate` a mezzanotte UTC. Un soggiorno importato da iCal con orario vicino a mezzanotte UTC può finire nel giorno/mese sbagliato. Fix futuro: derivare il giorno in Europe/Rome (come `stays/domain/generation.ts`).
- **`closedDays` non cablato:** il dominio (ross1000/spot/umbria) sa azzerare l'occupazione nei giorni di chiusura, ma i loader non passano i giorni di chiusura (Norma non li traccia). Capacità pronta, inerte finché non c'è una sorgente di chiusura/disponibilità.
- **Doppio submit del check-in → `Guest` orfano (LOW, pre-esistente):** `addGuests` non deduplica; se l'ospite invia due volte si crea un secondo `Guest` (conteggio gonfiato). NON crea schedine doppie (la dedup-key le assorbe) né invii. Fix futuro: dedup ospite per (soggiorno, n° documento) — ora possibile perché il documento è obbligatorio — o guardia anti-re-submit nel form. Tocca `addGuests` (usato anche dai flussi host) → da fare con un test dedicato.

#### 10. App mobile (iOS/Android) — guscio Capacitor in `mobile/`

Lo scaffold dell'app nativa è pronto (PR1): guscio Capacitor che carica l'app live
(`app.norma.casa`) e aggiunge push (registrazione client), deep link, splash/status bar,
biometria opt-in. Riusa il 100% del prodotto. Cosa serve da te / da ambiente Mac:

- **Account store (a tuo nome):** Apple Developer (99 €/anno) e Google Play Console (25 €
  una-tantum). Senza, niente pubblicazione.
- **Setup nativo (solo su Mac, l'env remoto è Linux):** `cd mobile && npm install &&
npx cap add ios && npx cap add android && npx cap sync` (richiede Xcode + Android Studio).
- **Asset store:** sostituire i placeholder `mobile/assets/{icon,splash}.png` (512px) con icona
  **1024×1024** e splash **2732×2732** su avorio `#f7f2e8`.
- **Deep link — valori reali:**
  - iOS: in `public/.well-known/apple-app-site-association` sostituire `TEAMID` con l'App ID
    Prefix (Team ID Apple).
  - Android: in `public/.well-known/assetlinks.json` inserire il **SHA-256** del certificato di
    firma (da Play Console → App integrity, o `keytool -list -v -keystore <keystore>`).
- **Firma:** certificati/profili iOS + keystore Android + API key App Store/Play per Fastlane.
  **Mai nel repo** (keychain locale / secret CI). Le lane `mobile/fastlane/Fastfile` sono da
  completare con questi dati.
- **Privacy store:** Apple Privacy Nutrition Label + `PrivacyInfo.xcprivacy`; Google Data Safety.
  Stringhe permessi: Notifiche (PR1), `NSCameraUsageDescription` per lo scanner documento (PR3).
- **OAuth Google nella webview:** registrare lo scheme/redirect dell'app nel Google Cloud Console
  se si userà il login Google da dispositivo.

**Follow-up codice (PR successive, NON in questo branch):**

- **PR2 (HIGH — migrazione + segreti):** consegna push server-side. Tabella `DeviceToken`
  (con **backup fresco**, guardrail #2) + porta `PushSender` accanto a `EmailSender` + endpoint
  `POST /api/devices`; agganci a reminder ISTAT e alert reconcile T+1 Alloggiati; chiavi APNs
  (Apple) + FCM (Google) nei segreti. Rispettare il consenso granulare per-pilastro (safeguard #1).
- **PR3 (MEDIUM):** scansione documento al check-in (`@capacitor/camera` + ML Kit MRZ) che
  pre-compila i campi documento in `CheckinForm.tsx` (solo se `isNative()`).
- **Minori:** crash reporting nativo (`@sentry/capacitor`, escluso da PR1 per non confliggere con
  `@sentry/nextjs` già nel browser) e UI in `/account` per il toggle del blocco biometrico
  (`setBiometricLock`, già esposto in `src/lib/native`).

#### 11. App mobile — PR2: consegna push lato server (HIGH, migrazione)

Binari per inviare notifiche push agli host (es. "schedina da confermare", scadenze turismo).
Branch `claude/mobile-push-pr2` (stacked sul guscio PR1). Nessuna push reale parte senza chiavi.

- **⛔ NON mergiare la PR2 finché** (classe HIGH — guardrail #2 + AGENT_LAWS):
  1. **backup fresco verificato** (`~/bin/norma-backup.sh`, controlla `backup.log`);
  2. **migrazione validata sul Mac** con DB locale: `npm run db:migrate` (genera/conferma
     `20260624120000_add_push_notifications`; quella nel repo è hand-authored perché l'ambiente
     remoto non può girare Prisma engine);
  3. **chiavi caricate nei segreti** (Vercel): `FCM_SERVICE_ACCOUNT_JSON` (+ APNs Auth Key nel
     progetto Firebase) e `PUSH_ENABLED=true` SOLO quando vuoi accendere la consegna.
  - Il merge su `main` fa partire `migrate.yml` → applica a PROD: ecco perché serve il backup PRIMA.
- **Rollback migrazione** (additiva, nessun dato preesistente): `DROP TABLE "NotificationPreference";
DROP TABLE "DeviceToken"; DROP TYPE "DevicePlatform";`
- **Trigger AGGANCIATO in PR2 (gated):** il reminder mensile ISTAT (`istat-reminder.service.ts`,
  pilastro Turismo) ora invia **anche** una push all'OWNER, additiva all'email, best-effort e
  gated a valle (`PUSH_ENABLED` + consenso). Con il gate OFF non cambia nulla in prod.
- **⛔ Trigger NON agganciato — frozen area #1 (AGENT_LAWS):** l'alert reconcile T+1 **Alloggiati**
  (`Schedina.deadlineAt`) NON è stato toccato: "invio reale Alloggiati + cron invio/reconcile
  (PR #56)" è CONGELATO per decisione founder 2026-06-10. Si aggancia SOLO con tua decisione
  esplicita di scongelamento.
- **Cosa resta fuori (per scelta):** l'invio reale FCM/APNs (oggi stub gated `FcmPushSender`,
  attende le chiavi) e il toggle UI del consenso in `/account` (l'azione
  `setNotificationPreferenceAction` e il modello `NotificationPreference` ci sono già).

---

## PARTE 6 redesign (prodotto-first) — FASE 4 (piano) + FASE 5/6 (HARD STOP)

> Contesto: sessione 2026-06-25. FASE 2 (guscio + home) e FASE 3 (superfici) sono su **PR draft
> #167** (LOW/MEDIUM, non mergiata, attende l'OK sul look). FASE 4 NON costruita in autonomia di
> proposito; FASE 5/6 sono decisioni umane (guardrail #1). Mappa sorgente: 1 agente Explore sul
> codice reale.

### FASE 4 — flusso ospite→periodo + scan + onboarding (piano esecutivo, dopo l'OK sul look)

Molto esiste già; sono rifiniture mirate, **presentazione, zero schema, zero guardrail #1**:

1. **Badge "Adempimenti" per-ospite** in `src/app/stays/[id]/page.tsx` (GuestRow ~riga 372-416):
   3 micro-badge per ospite (Alloggiati / ISTAT / Tassa) per vedere lo stato nei 3 adempimenti su
   una riga. Lo schedina-status c'è già; ISTAT/tassa per-ospite vanno derivati da letture esistenti
   (`loadIstatSubmissionReadiness`, righe `TouristTaxDeclarationLine`). **Verificare la mappa
   ospite→stato senza inventare** (se un dato non c'è, mostrarlo "—", mai dedotto).
2. **Header "Periodo + scadenze" riusabile** (`src/components/.../PeriodStatus.tsx`, NUOVO): periodo
   corrente (mese/trimestre, da `period.ts`) + stato dei 3 pilastri. ⚠️ **NON inventare date di
   scadenza specifiche** (ISTAT/tassa variano e sono "DA VERIFICARE" nel codice — accuratezza
   normativa = vita o morte): tenere il framing qualitativo già in uso ("entro 24h dall'arrivo",
   "a fine mese/trimestre"). Montare su dashboard/istat/stays.
3. **Scan documento — indicatore di successo** in `checkin/[token]/CheckinForm.tsx` (~riga 195-216):
   checkmark + "Documento scansionato: rivedi i campi". ⚠️ **Native-only** (scanner solo in app):
   non verificabile nella preview web → serve build nativa per il test. Confermato: **nessuna foto
   salvata** (`lib/native/document-scan.ts`, OCR in-memory poi scartata) — mantenere così.
4. **Onboarding — iCal e "ospite di prova"**: oggi il wizard (`OnboardingWizard.tsx`) ha 5 step
   (welcome→activity→credenziali→property→ready); il link calendario in ReadyStep va bene così.
   iCal-in-wizard e test-guest = build grandi a basso ROI: lasciare fuori salvo richiesta.

### ⛔ FASE 5 — binari automazione / mandato / consenso per-pilastro (HARD STOP, guardrail #1)

- Lo **step "Consenso autorizzazioni" in onboarding** e il **toggle reale** nella sezione
  "invio automatico agli enti" di `/account` (oggi **sola presentazione**, "In arrivo") sono
  **esattamente** il safeguard #1 dell'auto-send (consenso granulare versionato/revocabile).
  **NON costruire lo storage del consenso né alcun wiring di Send in autonomia.** Si costruisce
  con te, OFF di default, Test-gate + DRY-RUN, e si accende **insieme** prima su struttura/ospite
  reale del FOUNDER, presidiato (CRITICAL). Mandato: wording da legale.
- L'auto-send Alloggiati **esiste già** (#99) ed è **spento di default**: non accenderlo, non riproporlo.

### ⛔ FASE 6 — integrazioni reali ISTAT/Tassa per-ente (HARD STOP)

- Portali regionali / pagoPA / GECOS / comuni: servono **spec esterne + credenziali reali** (vedi §9
  Sicilia AUTO = schema vault `RegionalCredential` = migrazione HIGH + backup + decisione primo invio).
  Nessun URL portale è nel codice (`routing.ts`: "DA VERIFICARE") → **non inventarli**. Una regione
  alla volta, con te.
