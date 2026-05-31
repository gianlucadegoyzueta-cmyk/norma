# Backend hardening — CHANGELOG

Branch: `feat/backend-hardening`. Corsia A: Gate #0 PDF + fix core invio/outbox.

---

## Gate #0 — Ricevuta PDF (2026-06-01)

**Comando:** `npm run alloggiati:gate0-pdf`  
**Artefatti:** `tmp/gate0-ricevuta/gate0-summary.json`

### Esito run iniziale

| Check | Esito |
|-------|--------|
| GenerateToken + Authentication_Test | OK (oggi Rome = 2026-06-01) |
| Ricevuta ultimi 30 giorni | Tutti `ERRORE_RECUPERO_RICEVUTA` |
| PDF scaricato | Nessuno |

**Interpretazione:** la credenziale è valida ma non ci sono acquisizioni interrogabili negli ultimi 30 giorni (o il codice errore copre anche ricevute vuote — da confermare quando avremo un giorno con Send reale).

**Gap mock vs reale (fix candidato #1):** il mock restituisce PDF base64 anche con zero acquisizioni; il sistema reale risponde `ERRORE_RECUPERO_RICEVUTA`. L'adapter `AcquisitionReceiptReader` di produzione dovrà gestire questo codice esplicitamente.

**Prossimo passo Gate #0:** ripetere con `ALLOGGIATI_RICEVUTA_DATES=<giorno-con-acquisizioni>` dopo un Send reale confermato, oppure indicare una data nota dal portale "Analisi Invii".

---

## Fix da scrivere (dopo Gate #0 con PDF)

1. Allineare mock Ricevuta a `ERRORE_RECUPERO_RICEVUTA` quando appropriato
2. Parser PDF reale (`AcquisitionReceiptReader` produzione)
3. … (da completare dopo analisi PDF)
