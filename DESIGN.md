# Design System Norma — "Carta & Inchiostro" / Concierge

> Handoff tecnico del design system **come implementato** (non un mockup: questo è il codice).
> Usalo per costruire nuove pagine restando coerente. Voce e contenuti → `~/dev/norma-marketing/BRAND.md`.
> Regola d'identità: **tema unico, carta chiara SEMPRE. Niente dark mode.**

L'estetica è un registro cartaceo curato: avorio caldo, inchiostro, sigillo di ceralacca in
terracotta. Due gusci coprono tutta l'app; le classi `.cmx-*` sono il vocabolario condiviso.

---

## 1 · Design tokens

Definiti in `src/app/globals.css` (`--brand-*`, mappati ai semantici) e ri-esposti dentro `.cmx`.
**Usa i token, non gli hex.**

### Colore

| Token semantico                      | Token brand                     | Hex                    | Uso                                        |
| ------------------------------------ | ------------------------------- | ---------------------- | ------------------------------------------ |
| `--background`                       | `--brand-avorio`                | `#F7F2E8`              | sfondo pagina                              |
| `--card` / `--cmx --carta`           | `--brand-carta`                 | `#FBF9F3`              | superfici card/riga                        |
| `--foreground` / `--inchiostro`      | `--brand-inchiostro`            | `#211C15`              | testo principale                           |
| `--muted-foreground` / `--soft`      | `--brand-inchiostro-soft`       | `#5B5347`              | testo secondario, meta                     |
| `--primary` / `--terracotta`         | `--brand-terracotta`            | `#BC4B2B`              | CTA, link, sigillo, accento                |
| `--terracotta-dark`                  | `--brand-terracotta-dark`       | `#9E3D22`              | hover primario, errore-testo               |
| `--salvia`                           | `--brand-salvia`                | `#6B7A5E`              | successo / quiete                          |
| `--salvia-soft`                      | `--brand-salvia-soft`           | `#EEF0E8`              | fondo badge successo                       |
| `--border` / `--ring` / `--hairline` | `--brand-hairline` / terracotta | `#E0D8C8` / terracotta | bordi (hairline) · focus ring (terracotta) |

**Contrasto verificato:** inchiostro/avorio ≈ 13:1 (AAA); soft/avorio ≈ 6.5:1 (AA). Mai testo
soft sotto i 14px su elementi critici.

### Tipografia

| Token            | Font                               | Uso                                           |
| ---------------- | ---------------------------------- | --------------------------------------------- |
| `--font-display` | **Fraunces** (variable, opsz auto) | titoli, marchio, h1/h2 — corsivo → terracotta |
| `--font-sans`    | **Geist**                          | corpo, UI, label                              |
| `--font-mono`    | **Geist Mono**                     | solo dati tecnici/codice                      |

Scala titolo pagina: `clamp(34px, 4vw, 54px)` (`.cmx-pagetitle`); section title 22px; intro 18px.

### Motion

| Token                     | Valore                           |
| ------------------------- | -------------------------------- |
| `--ease` / `--ease-brand` | `cubic-bezier(0.22, 1, 0.36, 1)` |

Durate ricorrenti: hover riga/card **0.25–0.3s**; ingresso `cmx-fadeup` **0.8–1s** con stagger
`calc(... + var(--i) * 0.12s)`; timbro "FATTO" `cmx-stampIn` **0.5s** `cubic-bezier(0.2,1.6,0.4,1)`;
sigillo in filigrana `cmx-slowspin` **240s linear infinite**. **`prefers-reduced-motion: reduce`
è gestito** (`concierge.css` §reduced-motion): animazioni azzerate.

---

## 2 · Tema — carta sempre

- **Nessun dark mode.** Lo script anti-flash è stato rimosso; `.dark` non viene mai applicata a `<html>`.
- `@custom-variant dark (&:is(.dark *))` e il blocco `.dark` in `globals.css` restano **dormienti**
  di proposito: NON rimuoverli (i `dark:` tornerebbero a `prefers-color-scheme`). NON aggiungere
  `ThemeToggle` (è stato eliminato).
- `.cmx` ribadisce i token a livello locale ed è light per costruzione (commento in `concierge.css`).

---

## 3 · I due gusci (shell)

### `ConciergePage` — pagine interne autenticate

`src/components/concierge/concierge-page.tsx` · importa `concierge.css` + `concierge-page.css`.

```tsx
<ConciergePage
  kicker="OUTBOX · ALLOGGIATI WEB"     // maiuscoletto spaziato, opzionale
  title="Schedine"                      // h1 Fraunces; <em> → corsivo terracotta
  intro={<>…</>}                         // sottotitolo, opzionale
  backHref="/stays" backLabel="Soggiorni" // default: /dashboard · "Dashboard"
  actions={<…/>}                         // slot a dx dell'header, opzionale
>
  {children}
</ConciergePage>
```

Rende: grana di carta (feTurbulence) · sigillo guilloche in filigrana · header con marchio
`SealMark` + link "← torna" · testata editoriale · `<main id="main-content" tabIndex={-1}>` +
skip-link "Salta al contenuto". **Presentazionale e PII-free.** `cmx-wrap` max-width **1140px**,
padding `28px 40px 80px`.

### `AuthShell` — pagine pubbliche/auth

`src/components/auth-shell.tsx`. Stessa firma carta (grana + sigillo filigrana) **senza** il chrome
da dashboard. Centratura, `Brand` cliccabile, kicker "Conformità affitti brevi", riga di fiducia
"Dati cifrati · conforme GDPR · server in UE". `width: "sm" | "md"`. Usato da login/signup/recupero/
reset/errore. (Onboarding e check-in ospite riusano la sola grana di carta.)

---

## 4 · Componenti `.cmx-*` (vocabolario)

| Classe                                              | Cosa                | Spec chiave                                                                      |
| --------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------- |
| `.cmx-pagehead` / `.cmx-pagetitle` / `.cmx-pagesub` | testata             | titolo Fraunces clamp(34–54px); `em`→italic terracotta; sub 18px soft            |
| `.cmx-section`                                      | blocco di contenuto | `margin-top: 40px` (primo: `style={{marginTop:0}}`)                              |
| `.cmx-section-title`                                | sottotitolo sezione | Fraunces 22px, weight 600                                                        |
| `.cmx-card` (+`.cmx-card-hover`)                    | card carta          | radius **18px**, padding 26/28; hover: lift −3px + ombra                         |
| `.cmx-row`                                          | riga elenco         | radius **14px**, padding 16/20; hover: lift −2px + ombra; `+.cmx-row` → gap 10px |
| `.cmx-row-main` / `-title` / `-meta`                | contenuto riga      | title 15px/600 inchiostro; meta 13px soft                                        |
| `.cmx-badge` + variante                             | stato               | pill radius 99px, 5/12px. Varianti ↓                                             |
| `.cmx-empty` (+`-title` / `-text`)                  | stato vuoto         | bordo **tratteggiato** hairline, padding 64px, title Fraunces 22px               |

### Badge — mappatura di stato (canonica)

| Variante          | Colore                             | Quando                                          |
| ----------------- | ---------------------------------- | ----------------------------------------------- |
| `.cmx-badge-ok`   | salvia su salvia-soft              | acquisita / attiva / pagata / successo          |
| `.cmx-badge-wait` | soft su carta + bordo hairline     | da inviare / in attesa / bozza / da verificare  |
| `.cmx-badge-err`  | terracotta-dark su rgba terracotta | respinta / non valida / oltre scadenza / errore |
| `.cmx-badge-go`   | carta su terracotta (pieno)        | call-to-action / "consigliato"                  |

Le card interattive (form, controlli outbox) restano `ui/Card` con `style={{borderRadius:18}}` +
`CardTitle className="font-display"` per allinearsi al guscio.

---

## 5 · Marchio

`SealMark` (`src/components/ui/seal-mark.tsx`) — **unico marchio ovunque**: sigillo scanalato
(ceralacca, 14 bozzi) + anello + monogramma **N la cui asta destra termina in spunta**, in
`currentColor` (terracotta). `viewBox 0 0 40 40`, dimensionato dal contenitore
(`.cmx-brand svg { width/height: 30px; color: var(--terracotta) }`). Wordmark "Norma" in Fraunces.
**Non** ridisegnare il logo inline: importa `SealMark`.

---

## 6 · Responsive

| Breakpoint                      | Comportamento                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Desktop (>900px)                | layout pieno, `cmx-wrap` 1140px centrato                                                          |
| ≤900px (`concierge.css` §media) | header/testata e griglie collassano a colonna; padding ridotto                                    |
| Mobile autenticato              | `MobileNav` (bottom-bar + FAB ⌘K) montata da `SiteHeader`; safe-area iOS via `viewport-fit=cover` |

Le pagine usano Tailwind per il layout-glue (`flex`, `grid`, `gap`, `sm:`) e le `.cmx-*` per le
superfici brandizzate.

---

## 7 · Stati & edge case

- **Vuoto:** sempre `.cmx-empty` con titolo Fraunces + frase guida + (se utile) link terracotta all'azione.
- **Loading:** `page-skeleton.tsx` / skeleton shadcn; mai spinner nudi su pagina intera.
- **Errore di rendering grave:** `app/global-error.tsx` → fallback brandizzato avorio + cattura Sentry (inerte senza DSN).
- **Testo lungo:** `truncate` su title/meta delle righe; `text-balance`/`text-pretty` su titoli e paragrafi.
- **Errore campo (form):** bordo/sotto-messaggio dai componenti `ui/field`.

## 8 · Accessibilità (già a sistema)

- **Skip-link** "Salta al contenuto" → `#main-content` (primo focusabile in entrambi i gusci).
- `<main tabIndex={-1}>` per il focus post-navigazione.
- **Focus ring** = `--ring` (terracotta) via `focus-visible:ring-2`.
- SVG decorativi (grana, sigillo) con `aria-hidden`; il marchio ha `aria-label="Norma — dashboard"`.
- Sentence case ovunque; mai ALL CAPS (tranne i kicker, che sono `text-transform` su testo normale).
- Contrasto AA verificato (vedi §1).
