# Corsia D v2 — "Concierge MAX" nell'app (direzione APPROVATA da Gianluca, 2026-06-11)

**La direzione è DECISA, non reinterpretarla.** Riferimento visivo vivo (aprilo nel browser
e clicca le proposte): `docs/design/concierge-max-reference.html`. L'app deve diventare QUELLA.
Il sito marketing NON si tocca.

## L'anima: Warm Concierge potenziato

Norma parla in prima persona, ha già lavorato, propone — l'host approva con un tocco.
Il loop emotivo firmato: **proposta → press → timbro FATTO ✓ → la card scivola nel diario**.
L'app dimostra continuamente di lavorare per l'host (diario "Fatto da Norma").

## Brand (vincoli assoluti)

- Font: **Fraunces** (titoli, già copiato in `src/app/fonts/` con OFL) via next/font/local
  come fa il marketing; Geist + Geist Mono (next/font/google) per testo e dati.
- Token UFFICIALI (da norma-marketing/globals.css): avorio #f7f2e8, carta #fbf9f3,
  inchiostro #211c15, inchiostro-soft #5b5347, terracotta #bc4b2b, terracotta-dark #9e3d22,
  salvia #6b7a5e, salvia-soft #eef0e8, hairline #e0d8c8. Allinea i token dell'app a questi
  (oggi l'app ha token simili ma non identici: uniformare).
- Logo: il sigillo a N del sito (SVG nel reference, header).
- Identità carta chiara: NIENTE dark mode nelle pagine ridisegnate (coerenza col marketing:
  "l'identità è la carta chiara, sempre"). Se l'app ha theme toggle, le pagine nuove
  restano su carta.

## Motion system (token, da rispettare ovunque)

- Easing unico: `cubic-bezier(.22,1,.36,1)` · durate: micro 250ms, entrata 700ms, scena 1400ms.
- Coreografia d'ingresso a scaglioni (stagger 120-150ms), SOLO transform/opacity (60fps).
- Odometro a rulli per i numeri importanti (vedi reference, componente `digit/col`).
- Grana carta: feTurbulence fissa a bassa opacità (dal reference), `pointer-events:none`.
- Sigillo guilloche in filigrana dietro la testata della dashboard, rotazione 240s.
- Tilt 3D + spotlight su card interattive (mousemove, max 7-9 gradi).
- Timbro: scale 2.1→0.94→1 con rotate, anello d'inchiostro che si espande (vedi reference).
- `prefers-reduced-motion`: tutto degrada a opacità statiche.

## Scope stanotte (in ordine)

### 1. Dashboard (`/dashboard`) — la scena principale

- Hero centrale: saluto in prima persona con DATI VERI ("Stanotte ho fatto N cose…" =
  conteggio reale da eventi: schedine acquisite ieri, prenotazioni importate, ecc.).
  Kicker mono con data e stato posizione (regolare/da fare) calcolato dai dati.
- 4 KPI a odometro con dati reali: occupazione mese (da stays), ospiti registrati (mese),
  tassa maturata trimestre (dal modulo tourist-tax), ore risparmiate (stima: ospiti×15min).
- **Proposte** — SOLO su azioni che ESISTONO già nel prodotto. Niente finzioni:
  a) Check-in mancante per arrivo imminente → CTA "Copia link check-in" (il link esiste)
     + apertura WhatsApp Web precompilato se c'è il telefono. NON dire "ho mandato" — di' "pronto da mandare".
  b) Schedine preparate in attesa di conferma → CTA porta a /schedine con focus.
  c) Bozze importate da iCal senza ospiti → CTA "Completa ospiti".
  d) Export tassa trimestre disponibile → CTA scarica CSV (esiste già).
  Il timbro FATTO si imprime quando l'azione è COMPIUTA davvero (link copiato, ecc.).
- Agenda settimana: arrivi/partenze (da stays) + scadenze (tassa, ISTAT) con timeline che
  si disegna; nota "Norma:" su cosa farà lei.
- Diario "Fatto da Norma": eventi di sistema reali (import iCal, riconciliazioni, ISTAT
  inviato) dalle tabelle esistenti. Se serve un piccolo reader aggregato, domain puro + test.

### 2. Se la dashboard è COMPLETA e CI verde: `/onboarding` nella stessa lingua

Prima impressione concierge: "Ciao, sono Norma. Mi occupo io della burocrazia.
Tre domande e partiamo." Stessi token, stesso motion. Niente redesign dei form interni:
solo testata, copy, progress e transizioni.

## Verifica visiva (obbligatoria)

Loop Playwright su porta 3010 (`npm run dev -- -p 3010`): screenshot desktop 1280×800 e
mobile 390×844 di ogni stato (pieno, vuoto, con proposte, dopo approvazione), LEGGI gli
screenshot, critica, itera. Gli screenshot before/after vanno nei commenti della PR.

## Regole

- Niente migrazioni schema. Niente nuove dipendenze pesanti (vietate librerie animazione:
  tutto CSS/rAF come nel reference). Componenti riusabili in `src/components/ui/`.
- E2E esistenti devono restare verdi (la suite smoke di #64 gira in CI).
- PR con before/after; merge consentito se CI verde E la pagina regge il confronto col
  reference (giudizio onesto nel body PR). In dubbio: PR aperta per Gianluca.
- Aggiorna NIGHT-LOG.md.
