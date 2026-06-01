# Backend hardening — CHANGELOG

Branch: `feat/backend-hardening`. Corsia A: Gate #0 PDF + fix core invio/outbox.

---

## Gate #0 — Ricevuta PDF (2026-06-01)

**Comando:** `npm run alloggiati:gate0-pdf`
**Artefatti:** `tmp/gate0-ricevuta/gate0-summary.json`

### Esito run iniziale

| Check                               | Esito                            |
| ----------------------------------- | -------------------------------- |
| GenerateToken + Authentication_Test | OK (oggi Rome = 2026-06-01)      |
| Ricevuta ultimi 30 giorni           | Tutti `ERRORE_RECUPERO_RICEVUTA` |
| PDF scaricato                       | Nessuno                          |

**Interpretazione:** la credenziale è valida ma non ci sono acquisizioni interrogabili negli ultimi 30 giorni (o il codice errore copre anche ricevute vuote — da confermare quando avremo un giorno con Send reale).

## Fix #1 — Ricevuta: errori tipizzati + mock allineato al live (2026-06-01)

- `AlloggiatiReceiptUnavailableError` per `ERRORE_RECUPERO_RICEVUTA` (Gate #0): giorno senza PDF/acquisizioni.
- `AlloggiatiReceiptError` per altri rifiuti (es. giorno corrente).
- Mock: giorni senza acquisizioni → `ERRORE_RECUPERO_RICEVUTA` (non più PDF vuoto).
- `SoapAcquisitionReceiptReader`: adapter produzione; unavailable → `[]` per riconciliazione T+1.
- `parseReceiptPdfBase64`: parser mock + stub esplicito per PDF reali (%PDF-).

## Fix #2 — Recupero SENDING stale + riconciliazione T+1 in UI (2026-06-01)

- `recoverStaleSending`: schedine in SENDING > 2 min → UNVERIFIED (crash post-claim).
- Outbox invoca il recovery all'avvio di ogni batch.
- Action `reconcileCredentialAction` + sezione "Da verificare" su `/schedine` con data Ricevuta.

## Fix da scrivere (dopo Gate #0 con PDF reale)

3. Parser PDF reale in `parseReceiptPdfBase64` (campione Gate #0)
4. … (altri gap outbox/timeout da mappare)
