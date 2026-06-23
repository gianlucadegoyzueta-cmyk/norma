# NIGHT-LOG — corsa autonoma NORMA

> Append-only. In cima il riepilogo onesto; sotto, una riga per unità.
> Modello operativo: lavoro a sessione (non demone 6h). Spedisco in prod SOLO unità
> sicure, reversibili e SENZA migrazioni. Le feature con schema sono parcheggiate
> in NEEDS-HUMAN con migrazione generata ma NON applicata (niente backup garantito sul DB prod).

## SESSIONE 2026-06-23 (giorno) — progress-check: merge backlog PR + pulizia + decisione auto-send

Sessione di verifica + spedizione su richiesta del founder ("mergia tutto", "fixa tutto",
"continua in autonomia"). Tutto **LOW/MEDIUM**, zero schema, zero invii reali.

- **PR #121** (dependabot, 8 bump minor/patch) — **mergiata** (`5b5adce`). Branch aggiornato su main
  prima del merge, CI verde.
- **PR #86** (digest settimanale + storico compliance, G3) — **mergiata** (`5c0c260`) nonostante il
  marchio "NON mergiare": il marchio era per l'**accensione** (flag `DIGEST_ENABLED`, decisione del
  founder), non per il merge del codice — il cron resta no-op a flag spento. Aggiornato il branch su
  main due volte (per testarlo contro #121) prima del merge. **Primo merge su main → CI rossa per
  FLAKE** (`E2E smoke`: `next/font` non è riuscito a scaricare Geist Mono da Google Fonts). Riprodotto
  in locale = verde su tutti gli step → **re-run dei failed jobs → verde**. Non è una regressione.
- **PR #142** (questa pulizia) — **mergiata** (`e7e5a84`): rimossi 3 import inutilizzati (lint
  3 warning → 0) e allineato `NEEDS-HUMAN.md` (#105 risulta mergiato con **opzione A**: support-AI +
  migrazione `add_support_tickets` già in prod; la sezione "decidere A/B" era stale).
- **Review di #86 post-merge** (codice ora in prod): gate cron fail-closed corretto, finestra
  settimanale UTC deterministica, query tutte filtrate per `organizationId`, service resiliente
  per-org/per-destinatario, dominio compliance puro con mesi "quiet" neutri. **Nessun difetto:
  nessun cambio di codice fabbricato.**
- ⛔ **AUTO-SEND REALE AGLI ENTI: richiesto dal founder in chat, RIFIUTATO in autonomia** (guardrail
  #1, CRITICAL). Il primo Send reale è decisione presidiata su ospite vero con verifica ricevuta T+1,
  MAI flippato da un agente in sessione. Resta spento. Stessa logica per l'accensione del **digest**
  (email reali → decisione founder): lasciata spenta.
- CI locale completa verde a ogni merge: format · lint · typecheck · test **857** · build.

---

## SESSIONE 2026-06-12 (notte) — coda 2, corsia G3: ritmo e fiducia nel tempo

**Unità G3** (`feat/digest-score`) — **PR #86 APERTA, NON mergiata** (rischio **HIGH**: cron nuovo
ed email automatica in uscita). CI GitHub **verde** (Lint·Typecheck·Test·Build + E2E Playwright +
Vercel). **Non è online**: l'accensione (`DIGEST_ENABLED=true` su Vercel) la decide il founder.

- **a) Digest settimanale "Fatto da Norma"** — route `GET /api/cron/digest`, email del lunedì
  (canale Resend esistente, nessun nuovo segreto): cosa ha fatto Norma nella settimana (conteggi
  reali), cosa serve adesso, posizione regolare sì/no. **Disattivata di default**: gira solo con
  `DIGEST_ENABLED="true"` **e** auth del cron Vercel (`Bearer CRON_SECRET`). Schema a due barriere
  identico al cron Alloggiati ma **flag SEPARATO**: accendere il digest non tocca gli invii alla
  Questura. Esempio in `vercel.cron.digest.example.json`. Finché il flag ≠ "true" → no-op
  `200 {disabled:true}`. Servizio resiliente per-org/per-destinatario.
- **b) Storico compliance** (`/compliance`): vista mensile "posizione regolare" calcolata
  retroattivamente (schedine acquisite vs attese per gli arrivi del mese · tasse dichiarate non in
  lavorazione). Righe di registro ✓/⚠; mesi senza movimento neutri (niente ✓ ingannevoli).
- **Zero schema, zero invii reali alla Questura**: tutto dai dati esistenti. Moduli ports/adapters
  `digest` e `compliance`, dominio puro e testato, query isolate per `organizationId`.
- **Test**: 29 nuovi (gate cron, email IT singolare/plurale/sezioni-vuote, finestra settimanale,
  servizio con `FakeEmailSender`, verdetto mensile + utility mesi).
- **CI locale**: format ✓ · lint ✓ · typecheck ✓ · test ✓ · build ✓. NB: in locale fallisce **1**
  test pre-esistente non correlato (`billing/stripe-gateway-signature` "non configurato") —
  artefatto del `.env` caricato da vitest (`STRIPE_SECRET_KEY` presente → `isConfigured()` true);
  in CI, senza `.env`, passa. File identico a `main`. Verificato: con la chiave non settata, suite
  intera verde.
- **Discoverability**: la pagina `/compliance` non è linkata da un menu (la navbar/dashboard è di
  un'altra corsia — non toccata). Il digest la richiama nel footer ("voce «Storico»"). Aggiungere
  la voce di nav resta alla corsia dashboard / al founder.
- **NB founder — decisione richiesta**: accendere il digest = email automatiche reali agli host
  (OWNER/ADMIN). Opzioni: (1) merge con `DIGEST_ENABLED` OFF ora, accensione dopo i piloti;
  (2) merge e accensione su un'org pilota interna; (3) tenere la PR parcheggiata. Raccomandazione:
  **(1)** — codice in main, interruttore spento, si accende quando vuoi. Rischio: nullo a flag OFF.

## SESSIONE 2026-06-12 (notte) — coda 2, corsia G2: command palette ⌘K + mobile/PWA

**Unità G2** (`feat/cmdk-mobile`) — **PR #83 mergiata** (squash `34dc113`), CI GitHub verde
(Lint·Typecheck·Test·Build + E2E Playwright + Vercel), health-check `{"status":"ok"}`.
Rischio **MEDIUM** (UI/comportamento, zero schema, zero invii reali) — merge da spec (CI verde).

- **a) Command palette ⌘K** (`command-palette.tsx`, **custom** — niente nuove dipendenze, stesso
  pattern accessibile del `ComboBox` esistente): navigazione a **tutte** le sezioni + azioni
  rapide (_Nuovo soggiorno_, _Sincronizza iCal_ su tutti i feed dell'org, _Copia link check-in
  dell'arrivo imminente_). Scorciatoia ⌘K/Ctrl-K + bottone discreto nell'header; apertura via
  evento globale (riusato dal FAB mobile). Tastiera completa (↑↓/↵/esc), `role=dialog/combobox/
listbox`, scroll-lock, click-outside. Le azioni **riusano i servizi di dominio**
  (`ReservationImportService.syncProperty`, `createCheckinToken`) — nessuna logica server nuova.
- **b) Mobile + PWA**: `manifest.webmanifest` (icona **sigillo** generata da SVG con sharp →
  `public/icon-*.png`, nome Norma, tema **avorio**, standalone, start `/dashboard`), meta iOS
  (`apple-touch-icon`, `appleWebApp`, `viewport-fit=cover`), **bottom-bar** mobile (< md) con le
  4 sezioni chiave + **FAB concierge** che apre la ⌘K. Padding contenuto via
  `body:has([data-mobile-nav]) main` (nessun `<main>` di pagina toccato). Niente service worker.
- **Zero schema, zero invii reali**: sorgente unica delle sezioni in `src/lib/nav.ts` (condivisa
  palette/bottom-bar). Aree intoccate: `src/app/dashboard` (corsia #71). Le icone PWA sono
  rigenerabili con `node scripts/generate-pwa-icons.mjs`.
- **Test**: invarianti config nav (la bottom-bar referenzia `NAV_SECTIONS` per indice → guardia
  contro riordini). CI locale: format ✓ · lint ✓ · typecheck ✓ · test **452** ✓ · build ✓
  (`/manifest.webmanifest` presente). NB: in locale fallisce **1** test pre-esistente non
  correlato (`billing/stripe-gateway-signature`) — artefatto del mio `.env` (`STRIPE_SECRET_KEY`
  presente → `isConfigured()` true); in CI, senza `.env`, passa (job verde). Verificato.
- **Screenshot live non catturati**: night-run senza sessione locale seedata e `.env` punta al DB
  di **produzione** (off-limits, guardrail). L'E2E smoke su CI ha esercitato i flussi autenticati
  senza regressioni. Da rivedere a occhio umano sulla preview Vercel: apertura ⌘K, FAB mobile,
  install PWA. Icona sigillo verificata visivamente (terracotta su avorio).

---

## SESSIONE 2026-06-12 (notte) — coda 2, corsia G4: wizard iCal con anteprima

**Unità G4** (`feat/ical-wizard`) — **PR #87 mergiata** (squash `052d5af`), CI GitHub verde
(Lint·Typecheck·Test·Build + E2E Playwright + Vercel), health-check `{"status":"ok"}`.

- **Cosa**: l'import iCal ora ha un'**anteprima**. Incolli l'URL → Norma legge il feed e mostra
  le prenotazioni trovate (date, notti, sorgente) **prima** di importare → confermi → import con
  riepilogo. Sostituisce il flusso a due passi (`AddICalForm` "collega" + bottone "Sincronizza")
  unendolo in **un solo gesto con anteprima**, senza duplicarlo. Il re-sync dei feed già
  collegati (`ICalImportRow` → "Sincronizza ora") resta invariato.
- **Stati di errore gentili**: URL non valido · rete giù/timeout · calendario vuoto · calendario
  con **sole date bloccate** (distinto dal vuoto, con conteggio "date bloccate ignorate").
- **Come**: `domain/preview.ts` puro (`buildPreview` — dedup per UID coerente con la
  riconciliazione, ordine per arrivo, calcolo notti). Service: `previewImport(url)` **senza
  scritture a DB** + `importNow()` (collega+sincronizza). Actions `previewImportAction` /
  `confirmImportAction` (date formattate lato server, Europe/Rome); tipi in `ical-types.ts`
  (un file `"use server"` esporta solo funzioni async). UI `ICalWizard` (token Carta & Inchiostro).
- **Zero schema, zero invii reali**: tutto calcolato dal feed col parser esistente; l'anteprima
  riusa la stessa superficie fetch di `syncImport` (`ICalHttpFetcher`: http/https, 10s, 5MB,
  guard `VCALENDAR`), gated da auth + own-property. Rischio **MEDIUM**, merge da spec (CI verde).
- **Test**: dominio `preview` (5) + service `previewImport`/`importNow` (+6). 46/46 nel modulo
  reservations. CI locale: format ✓ · lint ✓ · typecheck ✓ · build ✓.
- **NB** (come G1): in locale fallisce **1** test pre-esistente non correlato
  (`billing/stripe-gateway-signature` "non configurato") — il mio `.env` ha `STRIPE_SECRET_KEY`,
  così `isConfigured()` è true; in CI (senza `.env`) **passa** — confermato dalla job verde.
  Verificato fallire identico su `origin/main` con le mie modifiche in stash.
- **Screenshot**: non catturati in questa corsa headless (richiedono sessione autenticata +
  immobile + feed iCal reale da fetchare). Comportamento coperto da build + tipi + test;
  visibile sulla preview Vercel della PR.

---

## SESSIONE 2026-06-12 (notte) — coda 2, corsia G1: fiducia nei dati

**Unità G1** (`feat/stay-timeline-export`) — **PR #84 mergiata** (squash `8667ef9`), CI GitHub
verde (Lint·Typecheck·Test·Build + E2E Playwright + Vercel), health-check `{"status":"ok"}`.

- **a) Timeline del soggiorno** (`/stays/[id]`): storia verticale end-to-end stile concierge con
  i soli eventi realmente accaduti — origine (import iCal / creazione manuale), check-in ospite
  completato, schedine **preparate→inviate→acquisite** (con n. ricevuta), tassa
  **conteggiata/dichiarata**. Nodi salvia, timestamp mono, "Norma:" sulle sue azioni. Dominio
  puro `buildStayTimeline()` che aggrega le schedine per traguardo (N ospiti ≠ N×3 righe).
- **b) Esporta i tuoi dati** (`/credentials`): bottone "Esporta i tuoi dati" → **un unico zip**
  (`soggiorni`/`ospiti`/`tasse-di-soggiorno`/`istat`.csv). Copy "I dati sono tuoi, sempre.".
  Encoder ZIP "store" **senza dipendenze nuove** (CRC-32 + APPNOTE), CSV con la convenzione
  esistente (`;`, CRLF). Export escluso il sensibile (niente documenti/segreti), isolato per org.
- **Zero schema, zero invii reali**: tutto calcolato da dati esistenti. Rischio **MEDIUM**, merge
  consentito da spec (CI verde).
- **Test**: dominio timeline (7) + CSV (7) + zip incl. CRC-32 noto e round-trip store (6).
- **CI locale**: format ✓ · lint ✓ (0 errori) · typecheck ✓ · test ✓ · build ✓. NB: in locale
  fallisce **1** test pre-esistente non correlato (`billing/stripe-gateway-signature` "non
  configurato") — artefatto del mio `.env` caricato da `vitest.config.ts` (`STRIPE_SECRET_KEY`
  presente → `isConfigured()` true); in CI, senza `.env`, passa. File identico a `main`.
- **Screenshot**: viste dietro auth + dati seminati (timeline significativa richiede un soggiorno
  con check-in/schedine/ricevuta/tassa) → non riproducibili in modo affidabile stanotte;
  comportamento coperto dai test di dominio. Verificabile sulla preview Vercel della PR.
- **NB founder**: l'export include nome/nascita/cittadinanza ospiti (no documenti) — è l'host che
  scarica i **propri** dati (azione manuale, scoping per org), non un invio a terzi.

---

## SESSIONE 2026-06-11 (giorno) — flotta diurna, corsia Q3 (a11y + copy, 2º giro)

**Online (mergiato + CI verde + health-check):**

- **PR #75** — **pass a11y + copy concierge** su `/properties`, `/stays`, `/credentials`, `/tourist-tax` (le quattro non coperte dal 1º giro). a11y: `/tourist-tax` ora ha `<main id="main-content" tabIndex={-1} outline-none>` + link "Dashboard" (era l'unica senza, mancava il target dello skip-link); `aria-hidden` su tutte le icone decorative lucide in pagine e form; focus-visible ring sul link scheda immobile; `aria-labelledby` sulle `<section>`→`<h2>`; `BuildDeclarationForm` usa il token `text-success` invece di `text-emerald-600` hard-coded. Copy in prima persona sobria ("Collego ogni immobile…", "genero le schedine…", "le custodisco cifrate…", "Preparo le dichiarazioni…"). **Nessun cambio** di schema/dominio/invii — solo markup/classi/copy. CI: format, lint, typecheck, **432 test**, build + E2E smoke Playwright + Vercel tutti verdi. ✅ main `18c4145`, health-check `{"status":"ok"}`.

**Guardrail rispettati:** nessun Send reale, nessuna migrazione, nessuna cancellazione, niente push su main (PR #75 + CI verde, poi squash-merge). Branch `chore/a11y-copy-pass-2` eliminato.

---

## SESSIONE 2026-06-11 (giorno) — corsia F: email transazionali check-in

**Unità f** — modulo `notifications` (domain puro + port `EmailSender` + adapter sul canale
Resend ESISTENTE). Template IT/EN: invito + promemoria (scelto dalla vicinanza dell'arrivo, ≤72h).
Azione MANUALE sul soggiorno (`/stays/[id]`): l'host inserisce l'email di contatto e invia il
link; feedback "INVIATA ✓" sobrio (stile Concierge). NESSUN invio automatico (cron congelati).
**Nessuna migrazione** (DECISIONS **D5**): email manuale al momento dell'invio + tracciamento via
log email-free (mai indirizzi in chiaro). Test: 17 nuovi (snapshot template IT/EN invito+promemoria,
adapter con transport finto, scelta kind, validazione email). CI completa locale verde
(format/lint/typecheck/build + 449 test). Feature additiva, azione solo manuale → merge consentito.

---

## SESSIONE 2026-06-11 (notte) — Corsia D: dashboard "Concierge MAX" (design)

**In PR (CI verde locale, attesa merge):**

- **Dashboard `/dashboard` ridisegnata "Concierge MAX"** secondo il reference approvato
  (`docs/design/concierge-max-reference.html`): hero "ink reveal" per-parola in prima persona con
  DATI VERI ("Stanotte ho fatto N cose…" = conteggio eventi reali), 4 KPI a odometro a rulli
  (occupazione mese da `stays`, ospiti registrati, tassa maturata trimestre, ore risparmiate),
  proposte con loop **proposta → press → timbro FATTO ✓ → riga nel diario**, agenda settimana con
  timeline che si disegna, diario "Fatto da Norma" da eventi di sistema reali (import iCal,
  ricevute Questura, riconciliazioni, ISTAT). Motion system del reference (easing
  `cubic-bezier(.22,1,.36,1)`, stagger, grana carta, sigillo guilloche, tilt 3D, `prefers-reduced-motion`).
- **Solo azioni REALI** nelle proposte (niente finzioni): check-in mancante → "Copia link check-in"
  (riusa `generateCheckinLinkAction`, timbro solo a copia avvenuta — "pronto da mandare", non "ho mandato");
  schedine in attesa → `/schedine`; bozze iCal senza ospiti → "Completa ospiti"; export tassa trimestre → `/tourist-tax`.
- **Dominio puro + test**: `src/server/modules/dashboard/concierge-digest.ts` (digest diario +
  occupazione), 7 test. Reader dati reali in `src/app/dashboard/_lib/data.ts` (solo letture aggregate, **nessuna migrazione**).
- **Token uniformati** ai valori UFFICIALI del marketing (hex esatti) in `globals.css` + token motion.
  **Fraunces** servita via `next/font/local` (woff2 + OFL già in `src/app/fonts/`), come il marketing.
  Identità carta chiara SEMPRE sulla pagina ridisegnata (scope `.cmx`, niente dark).
- **`/onboarding`**: testata e copy in voce concierge prima persona ("Ciao, sono Norma. Mi occupo io
  della burocrazia. Tre domande e partiamo."), nessun redesign dei form.
- **Verifica visiva**: route dev `/dev/concierge` (404 in prod, gated anche nel middleware) per
  screenshottare gli stati (pieno/vuoto/timbro) desktop 1280×800 + mobile 390×844 senza DB/login.
  Screenshot before/after nei commenti PR.
- **CI locale**: format ✓ · lint ✓ (0 errori) · typecheck ✓ · 439 test ✓ · build ✓ · E2E smoke 5/5 ✓.

**Guardrail rispettati:** nessuna migrazione, nessun Send reale, niente push su main (PR+CI), niente
nuove dipendenze (motion tutto CSS/rAF), marketing non toccato.

---

## SESSIONE 2026-06-10 (notte) — reconcile per conteggio + scheduler disattivato

**Online (mergiato + CI verde + health-check):**

- **PR #55** — **riconciliazione T+1 PER CONTEGGIO** (verdetto Gate #0, DECISIONS D3→**D4**). La Ricevuta è AGGREGATA: niente match per-identità, si confronta il numero di schedine `UNVERIFIED` del giorno con `SCHEDINE INVIATE` della ricevuta. Esiti: pari→`ACQUIRED`; ricevuta vuota/assente→`PENDING` (re-inviabili, no doppione); diverse→**l'intero batch in `NEEDS_REVIEW`**. Nuovo port `RicevutaSummaryReader` + adapter `SoapRicevutaSummaryReader`; nuova transizione `UNVERIFIED→NEEDS_REVIEW`. **Nessuna migrazione** (enum/colonne già in schema da PR #51). Test: 358 verdi (reconcile per conteggio riscritto, adapter su PDF VERO via pdf-lib, transizione). ✅ main `a9f4736`.
- **PR #57** — **chore CI**: `migrate.yml` allineato a `actions/checkout@v6` + `setup-node@v6` (ci.yml era già su v6). Rende ridondanti le dependabot #32/#33. ✅ main `5cc9237`.

**Pronto in PR, NON mergiato (decisione tua):**

- **PR #56** — **scheduler invio+reconcile DISATTIVATO di default**. `GET /api/cron/alloggiati` con due barriere (`domain/cron-gate.ts`): flag `ALLOGGIATI_CRON_ENABLED` OFF di default → 200 `{disabled:true}`; anche da attivo solo cron Vercel autenticato (`Bearer $CRON_SECRET`, fail-closed). Orchestrazione testabile `runSendAndReconcile` (resiliente per-credenziale). `vercel.cron.example.json` per accenderlo. CI verde. **NON mergiata apposta** (guardrail #1: l'invio reale non si accende in autonomia). Dettaglio per accenderlo in NEEDS-HUMAN #5.

**Health-check (prod):** `/login` `/signup` `/api/health` = 200, `/dashboard` = 307 (gated), `norma.casa` = 200. `/api/cron/alloggiati` = 307 (atteso: la route è solo in PR #56, non ancora in prod). App sana.

**Guardrail rispettati:** nessun Send reale, nessuna migrazione (zero file di migrazione aggiunti → migrate.yml resta no-op), nessuna cancellazione, niente push su main (tutto via PR+CI verde). Rollback: nessuno.

**Prima azione consigliata al risveglio:** decidere su PR #56 (scheduler) — prima un primo invio reale manuale su ospite vero, poi eventualmente accendere il cron via env.

---

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

### [2026-06-10] Unità 5 — riconciliazione T+1 per CONTEGGIO (D3 → D4)

- **Branch:** `feat/reconcile-by-count` → PR #55
- **Cosa:** redesign del reconcile dal match per-identità al confronto di CONTEGGIO (la Ricevuta è AGGREGATA, Gate #0). Nuovo port `RicevutaSummaryReader` + adapter `SoapRicevutaSummaryReader` (su `parseRicevutaSummaryPdfBase64`; `ERRORE_RECUPERO_RICEVUTA`→null). `SchedinaReconcileService` confronta `UNVERIFIED` del giorno vs `SCHEDINE INVIATE`: pari→`ACQUIRED` (MATCH); ricevuta vuota/assente→`PENDING` (NONE_SENT, re-inviabili); diverse→`NEEDS_REVIEW` per l'intero batch (MISMATCH). Nuova transizione `UNVERIFIED→NEEDS_REVIEW`. Wiring `reconcileCredentialAction` con messaggio per verdetto. **Nessuna migrazione** (enum/colonne già presenti). DECISIONS D4.
- **Conservativo:** auto-conferma SOLO a conteggi pari, auto-riaccoda SOLO a ricevuta vuota; ogni ambiguità → revisione umana (mai falso ACQUIRED né doppione).
- **CI locale:** format ✓ · lint ✓ (0 errori) · typecheck ✓ · test 358 ✓ · build ✓
- **CI su PR #55:** verde (Lint·Typecheck·Test·Build + Vercel) · **ONLINE:** ✅ sì — main `a9f4736`

### [2026-06-10] Unità 6 — scheduler invio+reconcile DISATTIVATO (NON mergiato)

- **Branch:** `feat/cron-send-reconcile` → PR #56 (**aperta, non mergiata apposta**)
- **Cosa:** `GET /api/cron/alloggiati` disattivato di default. Gating puro `domain/cron-gate.ts` (flag `ALLOGGIATI_CRON_ENABLED` + auth `Bearer $CRON_SECRET`, fail-closed). Orchestrazione testabile `runSendAndReconcile` (`services/cron-runner.ts`): per ogni credenziale attiva send poi reconcile, resiliente per-credenziale. `PrismaCredentialRepository.listActiveCredentialIds()`. Route resa pubblica in `paths.ts` (auth nella route, non sessione). `vercel.cron.example.json` con le istruzioni per accenderlo.
- **CI locale:** format ✓ · lint ✓ (0 errori) · typecheck ✓ · test 368 ✓ · build ✓ (route presente)
- **CI su PR #56:** verde · **ONLINE:** ❌ no, di proposito (decisione umana — vedi NEEDS-HUMAN #5)

### [2026-06-10] Unità 7 — chore CI: migrate.yml su actions v6

- **Branch:** `chore/migrate-yml-actions-v6` → PR #57
- **Cosa:** `migrate.yml` allineato a `actions/checkout@v6` + `actions/setup-node@v6` (ci.yml era già su v6 e verde). Solo file workflow, reversibile. Rende ridondanti le dependabot #32/#33.
- **CI su PR #57:** verde · **ONLINE:** ✅ sì — main `5cc9237`

### [2026-06-10] Corsia A (flotta) — Import iCal prenotazioni Airbnb/Booking/VRBO

- **Branch:** `feat/ical-import` → PR #65 (**mergiata**)
- **Cosa:** le prenotazioni entrano in Norma da sole. L'host incolla l'URL iCal del calendario della struttura e Norma crea/aggiorna i **soggiorni in bozza** (da completare con gli ospiti). Modulo nuovo `src/server/modules/reservations` (ports/adapters, domain puro).
  - **Dominio puro testato:** parser **RFC5545 scritto a mano** (`domain/ical.ts` — unfolding, DATE/DATE-TIME, unescape, filtro blocchi "non disponibile"); **niente dipendenze native** → gira su Vercel (valutato `node-ical`, scartato: troppo peso `rrule`/`moment-timezone` per VEVENT piatti). `domain/source.ts` (detect Airbnb/Booking/VRBO dall'host + validazione URL). `domain/reconcile.ts` — **dedup per UID iCal** + regole annullamento (puro, idempotente).
  - **Regole annullamento (da spec):** evento sparito dal feed → bozza ancora vergine = `CANCELLED`; bozza già **arricchita** con ospiti = `NEEDS_CANCEL_REVIEW` (si segnala, non si tocca). Evento ricomparso → riattivato a `DRAFT`.
  - **Adapter:** `ICalHttpFetcher` (fetch con timeout via AbortController, errori parlanti, guard `BEGIN:VCALENDAR`); repo Prisma + InMemory; `ReservationImportService` orchestrazione. Sync **manuale** ("Sincronizza ora") — **niente cron** (congelati, CLAUDE.md ⛔).
  - **UI:** nuova `/properties/[id]` (linkata dalla lista immobili): collega/rimuovi URL iCal, stato ultimo sync (mai/ok/errore), lista prenotazioni importate in bozza con badge stato.
- **Schema (corsia autorizzata alle migrazioni stanotte):** additivo-only. `model ReservationImport` + campi nullable su `Stay` (`icalUid`, `importSource`, `importStatus`, `reservationImportId`; FK `onDelete:SetNull`; unique `(reservationImportId, icalUid)`). Enum `ReservationSource`, `StayImportStatus`. Nessun drop/rename/alter. **Migrazione testata in locale** su Postgres (docker/colima): applica pulita. **Backup prod fresco** prima del merge (`backup.log` OK 2026-06-10 23:22).
- **CI locale:** format ✓ · lint ✓ (0 errori) · typecheck ✓ · test **390** ✓ (+34 nuovi: ical/reconcile/source/service) · build ✓ (route `/properties/[id]` presente).
- **CI su PR #65:** verde (Lint·Typecheck·Test·Build + Vercel) · **migrate.yml prod:** applicata con successo · **ONLINE:** ✅ sì — main `9cbd609`

### [2026-06-10] Corsia B — Billing Stripe (sandbox), migrazione PARCHEGGIATA

- **Branch:** `feat/stripe-billing` → PR billing (CI verde, mergiabile: zero migrazioni applicate, zero chiavi usate)
- **Cosa:** modulo `src/server/modules/billing` con pattern ports/adapters. Dominio puro e testato: catalogo piani (annuale €120 / mensile €14, annuale-first), mappatura stati Stripe, **gating del trial "fino al primo ospite"** (`domain/access.ts`: trial finché 0 ospiti gestiti → al primo scatta l'abbonamento con 7 giorni di grazia; PAST_DUE in grazia fino a fine periodo; scaduto = sola lettura, scrittura bloccata), reducer webhook puro. Porte: `SubscriptionRepository`, `ProcessedEventStore` (idempotenza per event.id), `BillingGateway`, `GuestActivity`. Adapter: `StripeBillingGateway` (unico punto con l'SDK, verifica firma webhook), InMemory + Prisma per i repo. Servizi: checkout (Stripe Checkout hosted + Customer Portal), webhook (firma → idempotenza → upsert stato), gating (+ guard `requireWriteAccess`). UI `/billing` con stato, piani e bottoni Checkout/Portal **disabilitati senza chiavi** (messaggio chiaro). Webhook `POST /api/webhooks/stripe` (400 firma non valida, 500 errore→retry Stripe, 200 ok/dup/ignored). Script idempotente `scripts/stripe-bootstrap.ts`. Rotta resa pubblica in `paths.ts` (i webhook si autenticano via firma, non sessione).
- **Schema/migrazione:** modelli `Subscription` (1:1 Organization, predisposto `quantity` per fasce per n° immobili) + `ProcessedStripeEvent` + enum `SubscriptionStatus`/`BillingPlan`. Schema Prisma aggiornato (client generato per i tipi), ma migrazione **generata e PARCHEGGIATA** in `prisma/migrations-parked/` (fuori da `prisma/migrations/`): stanotte solo la corsia A migra. `/billing` degrada con grazia (P2021 intercettato) finché non è applicata.
- **Decisioni di prodotto (Piano Marketing) applicate:** annuale-first; trial legato al primo utilizzo NON a tempo (logica app-side, niente trial Stripe a giorni). Disallineamento "€12/mese" sul sito: noto, lo risolve Gianluca.
- **NON fatto apposta (regole flotta):** cablaggio del guard/banner nelle server action di scrittura di altri moduli → lasciato come follow-up in NEEDS-HUMAN #8 per non collidere con le altre corsie.
- **CI locale:** format ✓ · lint ✓ (0 errori) · typecheck ✓ · test 398 ✓ (40 nuovi, incl. webhook con **eventi finti FIRMATI**) · build ✓ (rotte `/billing` e `/api/webhooks/stripe` presenti)
- **Da te per andare ONLINE:** vedi NEEDS-HUMAN #8 (backup+migrazione, `stripe-bootstrap`, chiavi env, registrazione webhook).

### [2026-06-11] Corsia Q2 (coda staffetta) — Onboarding "concierge" (testata, copy, progress, motion)

- **Branch:** `design/onboarding-concierge` → PR (CI verde, additivo, zero schema)
- **Controllo preventivo:** la corsia D (`design/dashboard-concierge-max`) NON aveva toccato l'onboarding (verificato `git diff --name-only origin/main...design/dashboard-concierge-max` → nessun file `onboarding`). Q2 quindi mia.
- **Cosa:** `/onboarding` parla ora in **prima persona** ("mano sulla spalla"), allineato alla direzione Concierge MAX (spec lane-d §2). **Niente redesign dei form interni** (solo testata, copy, progress, transizioni):
  - **WelcomeStep** → prima impressione concierge: kicker mono "Ciao, sono Norma" + titolo "Mi occupo io della burocrazia" + sub in prima persona, con **rivelo a scaglioni** (stagger 120ms, solo transform/opacity).
  - **Testate** di ActivityStep/ConnectAlloggiati/FirstProperty/Ready riscritte in prima persona ("Parlami di te", "Apriamo il canale con la Questura", "Il tuo primo immobile", "Ci penso io, da qui").
  - **ReadyStep**: il segno di spunta finale entra col **timbro "FATTO"** (`ob-stamp`, rimbalzo+rotazione, dal reference).
  - **Stepper (progress)**: il connettore tra i passi completati si colora di terracotta (feedback d'avanzamento), `sr-only aria-live` invariato.
  - **Transizioni**: la scena dello step si rigioca a ogni passo (`key={step}` + `.ob-scene`), in aggiunta alla View Transition esistente.
- **Motion system** (in `globals.css`, `@layer utilities` + keyframes): easing unico `cubic-bezier(.22,1,.36,1)`, durata entrata 700ms, **tutto degrada a statico con `prefers-reduced-motion`**. Nessuna libreria di animazione (CSS puro, come da regole).
- **Token/font:** già allineati (terracotta/avorio + Fraunces `font-display`): nessuna modifica ai token.
- **CI locale:** format ✓ · lint ✓ · typecheck ✓ · test **432** ✓ (invariati: solo UI) · build ✓ (`/onboarding` 9.46 kB).
- **Verifica visiva:** la pagina è **dietro auth** (redirect a /login senza sessione): screenshot live richiederebbero sessione+DB seedati. Modifica copy/motion additiva e a basso rischio; confronto col reference fatto a livello di codice (tono prima persona, Fraunces, timbro, reduced-motion). Giudizio onesto: regge la direzione; in caso di dubbio visivo, Gianluca può rivederla sulla preview Vercel della PR.
