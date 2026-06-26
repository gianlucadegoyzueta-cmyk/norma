# EDITORIAL.md — verità editoriale Norma

**Fonte unica** per copy su app, sito, store, GTM e agenti.  
Aggiornato: 2026-06-26 (pivot mandato + safeguard). Precedenza su AGENTS.md marketing e REGISTRO-DIFETTI per il tono.

---

## Pitch (una frase)

**Compliance garantita in automatico per affitti brevi** — Norma esegue Alloggiati e turismo (tassa di soggiorno + ISTAT) per conto dell'host, su **mandato firmato una volta**, con safeguard visibili e garanzia commerciale a cap.

---

## Cosa promettiamo

- Norma **esegue** le comunicazioni obbligatorie ricorrenti (schedine Alloggiati, dichiarazioni turismo dove coperto).
- L'host resta **titolare** delle obbligazioni; Norma è esecutore tecnico / intermediario su delega.
- **Mandato granulare** per pilastro (Alloggiati, tassa, ISTAT), versionato e revocabile.
- **Validazione bloccante**: dati incompleti → non si invia, si segnala l'azione esatta.
- **Garanzia commerciale a cap** (min tra danno e 12 mesi di canone) su errori tecnici nostri — **non** polizza, **non** assunzione di responsabilità penale (art. 109/17 TULPS incedibile).
- Supporto umano in italiano, prezzo trasparente, niente costo a schedina.

---

## Cosa NON promettiamo

| Vietato                                               | Perché                                                                  |
| ----------------------------------------------------- | ----------------------------------------------------------------------- |
| "La burocrazia è sparita" / "zero pensieri"           | Implica automazione magica senza responsabilità                         |
| "Al riparo da multe" / "compliance garantita al 100%" | Sanzioni non assicurabili; claim legale assoluto                        |
| "Norma fa tutto da sola" senza mandato                | Manca la delega esplicita                                               |
| Invio automatico **attivo oggi** in pubblico          | Auto-send esiste ma è **spento di default** fino al go-live controllato |
| CIN come pilastro di vendita                          | Enabler tassa; adempimento una-tantum                                   |

---

## Stato tecnico (onesto in FAQ e legal)

- **Auto-send:** implementato con Test-gate, DRY-RUN e outbox conservativo — **disattivato di default**.
- **Primo Send reale** ad Alloggiati: decisione umana esplicita del founder su ospite vero (guardrail CRITICAL).
- **Circuit breaker:** nel dubbio, Norma non invia e segnala.

---

## Frasi approvate / vietate

| Contesto      | Usa                                                                             | Evita                                                               |
| ------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Hero / H1     | "Norma esegue per te, su mandato" · "Compliance in automatico, sotto controllo" | "sparita" · "Al resto pensa Norma"                                  |
| Sottotitolo   | "Firmi una volta. Norma invia agli enti. Tu controlli tutto."                   | "Non devi fare nulla"                                               |
| App dashboard | "Con il mandato attivo, preparo e invio" · "Ti avviso se serve un dato"         | "Decido io per te" · "Stanotte ho sistemato tutto"                  |
| Garanzia      | "Se sbagliamo noi, paghiamo noi — fino a X" (cap)                               | "Sei coperto" · "Polizza"                                           |
| CTA signup    | "Inizia gratis"                                                                 | Mix di "Prova gratis" / "Accedi" / "Registrati" sulla stessa azione |

---

## Prezzo canonico (2026-06)

**Gratis fino al primo ospite gestito**, poi:

| Segmento                                          | Mensile               | Annuale                 | Note                                                |
| ------------------------------------------------- | --------------------- | ----------------------- | --------------------------------------------------- |
| **Host** (1 struttura)                            | €9/mese per struttura | €90/anno (≈ €7,50/mese) | Piccoli host                                        |
| **Host** (2–4 immobili)                           | €9/mese per struttura | €78/anno per struttura  | Stesso piano, annuale scontato                      |
| **Property manager** (5+ strutture)               | €6/mese per struttura | €72/anno per struttura  | Scaglioni dedicati, onboarding assistito            |
| **Partner** (commercialisti / agenzie multi-host) | —                     | —                       | Canale dedicato via mail, non in listino self-serve |

**Incluso:** Alloggiati, tassa di soggiorno, ISTAT — comunicazioni illimitate, nessun costo a schedina.

Implementazione codice listino: [`norma-marketing/lib/pricing.ts`](../../norma-marketing/lib/pricing.ts) (sito) · billing app allineato quando Stripe attivo.

---

## Pilastri prodotto (pitch)

1. **Alloggiati** — schedine Polizia di Stato (Alloggiati Web).
2. **Turismo** — tassa di soggiorno + movimento ISTAT / portali regionali.

Tutto il resto (check-in, iCal, immobili, CIN) **alimenta** i pilastri.

---

## Dove si applica

| Superficie        | Repo / path                                |
| ----------------- | ------------------------------------------ |
| App UI            | `norma/src/app/`                           |
| Sito              | `norma-marketing/`                         |
| Store iOS/Android | `norma/mobile/fastlane/metadata/`          |
| GTM / outreach    | `norma-gtm/`                               |
| Agenti            | `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/` |

In caso di conflitto copy: **EDITORIAL.md** > codice UI > CLAUDE.md > marketing legacy.
