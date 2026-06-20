# Direzione estetica — Norma (app + marketing)

> **Scopo.** È la *direzione di gusto* esplicita che mancava — non un nuovo design
> system (quello esiste già: `globals.css` OKLCH + `components/ui/*` + `components/shell/app-shell.tsx`).
> Questo dice **dove** e **quanto** applicarlo, con riferimenti fissi e regole concrete.
> Nasce dal loop di feedback visivo (screenshot reali, vedi `docs/design/shots/`).

## Principio cardine — due superfici, due voci

- **Marketing (norma.casa)** = espressivo, editoriale, brand. Fraunces serif, ritmo
  ampio, scroll-reveal. Deve **sedurre**. → già curato (verificato a schermo), **non toccare**.
- **App (app.norma.casa)** = strumento. Calmo, denso, scannabile. Geist/sans, gerarchia
  netta, micro-motion. Deve far **lavorare in fretta senza pensare**. ← qui sta il lavoro.
- Fraunces serif **nell'app** si limita al **wordmark**. Niente H1 serif giganti nelle
  pagine operative (oggi violato — vedi "Lavoro aperto").

## North-star interno (già in repo)

- `docs/design/concierge-max-reference.html` — *"Concierge MAX v3"*: l'app come **concierge**
  che ti fa il briefing ("Stanotte ho fatto tre cose per te, due aspettano un tuo sì").
  **Geist sans**, terracotta corsivo per l'enfasi, palette avorio/terracotta/salvia.
  → è il tono della **dashboard**.
- `/dev/shell-preview` — la **lista densa** (tabella Schedine: chi/documento/struttura/arrivo/stato,
  selezione multipla, bulk-action, paginazione). → è il tono delle **pagine-dati**.

## Riferimenti esterni fissi (cosa rubare da ciascuno)

- **Linear** — densità, gerarchia, calma, micro-motion *funzionale*. Zero decorazione gratuita.
- **Stripe Dashboard** — tabelle dati: colonne scannabili, stati a pill, selezione + bulk, paginazione.
- **Mercury** — sobrietà tipografica, spazi misurati, serietà/fiducia.

## Regole concrete (app)

1. **Titoli pagina**: Geist/sans ~20–24px semibold. **Mai** Fraunces display.
2. **Densità**: righe 44–52px, padding contenuto medio; **niente watermark "sigillo"** nelle
   pagine operative (riservalo a dashboard/empty-state come accento, non come sfondo costante).
3. **Top bar**: sempre breadcrumb + **UNA** azione primaria contestuale terracotta
   (es. "Genera schedine"). Mai vuota.
4. **Liste = tabelle**: colonne (chi / cosa / dove / quando / stato) + chevron, stati a pill,
   selezione multipla + bulk-action bar, paginazione "1–N di M".
5. **Stati**: loading = skeleton AppShell (già fatto ✓), empty sobrio, errore chiaro e azionabile.
6. **Colore**: bg avorio; **terracotta SOLO** per azione primaria + accenti di stato.
   Token: `--brand-salvia` (ok), `--success`, `--warning` (ambra), `--inchiostro`, terracotta-dark (errore).
7. **Tipografia**: Geist/sans per la UI; Fraunces solo wordmark + marketing.
8. **Motion**: micro e funzionale (hover, selezione, enter). **Niente scroll-reveal teatrale** nell'app.

## Lavoro aperto — convergenza (decisione umana, vedi sotto)

9 pagine reali sono ancora sul trattamento editoriale (`ConciergePage`, serif/sparso), mentre i
loro `loading.tsx` usano **già** l'AppShell denso → incoerenza skeleton↔pagina:

`billing · credentials · istat · properties · properties/[id] · schedine · stays · stays/[id] · tourist-tax`

Migrazione = portare il **corpo** di queste pagine dal serif-editoriale alla lista/tabella densa
(la sidebar AppShell resta identica). La dashboard resta in tono concierge-narrativo (north-star).

## Loop operativo — come iterare il design d'ora in poi

1. `env NODE_ENV= npm run dev -- -p 3014` — le anteprime `/dev/*` rendono la UI interna **senza
   login né DB** (404 in produzione, vedi `src/middleware.ts`).
2. Playwright → screenshot `/dev/*` (per pagine animate: viewport a posizioni di scroll, **non**
   full-page — il full-page non innesca lo scroll-reveal e mente).
3. Osserva → critica contro **queste regole** + i riferimenti → modifica codice → ri-screenshot.
4. Archivia i before/after in `docs/design/shots/`.
