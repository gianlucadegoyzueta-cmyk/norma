# DECISIONS — scelte autonome (NORMA, corsa notturna)

> Ogni scelta non banale: decisione, alternative valutate, motivo. Per la review al risveglio.

## D0 — Modello operativo e confine sulle migrazioni

- **Decisione:** spedire in produzione solo unità sicure, reversibili e **senza migrazioni DB**. Le feature che richiedono cambi di schema vengono costruite e testate su branch, con migrazione _generata_ ma **non applicata**, e parcheggiate in NEEDS-HUMAN.
- **Alternative:** (a) fare `pg_dump` della prod e migrare in autonomia; (b) migrare senza backup.
- **Motivo:** non posso garantire un percorso di restore pulito del DB di produzione in autonomia; un fallimento di migrazione su un prodotto di compliance legale è un rischio asimmetrico. La regola dell'utente stesso impone di parcheggiare se il backup non è garantito. Le modifiche reversibili (design, copy, UI, export additivi) restano invece spedibili.

## D1 — Brand: evoluzione, non rivoluzione

- **Decisione:** mantenere UNA identità "Carta & Inchiostro" (terracotta + avorio + Fraunces, già in prod) e **rifinirla** (scala tipografica, spaziatura, gerarchia, micro-interazioni sobrie), senza ridisegni radicali né librerie UI pesanti.
- **Alternative:** nuova palette da zero; introdurre una component-library (Radix/shadcn completo).
- **Motivo:** coerenza prima dell'originalità; il brief chiede "una sola identità visiva applicata via token". Reversibile e a basso rischio.

## D2 — Cap max-tentativi outbox + dove "parcheggiare" le schedine esaurite

- **Decisione:** `MAX_SEND_ATTEMPTS=5`; oltre il cap la schedina viene **esclusa da `listPendingByCredential`** (non più auto-inviata) ma **resta PENDING**. Incremento di `attempts` centralizzato in `claimForSending` (rimosso il doppione in `transition()`).
- **Alternative:** (a) introdurre subito lo stato `NEEDS_REVIEW` per le esaurite — scartata: richiede migrazione enum (parcheggiata, vedi NEEDS-HUMAN #4); (b) usare REJECTED/UNVERIFIED come "parcheggio" — scartata: hanno semantiche precise, le sporcherei.
- **Motivo:** fermare il retry runaway è la priorità ed è ottenibile **senza schema** filtrando in query. Tenerla PENDING-inerte è reversibile e conservativo (nessun dato perso, nessuna transizione inventata). Follow-up naturale: stato `NEEDS_REVIEW` per renderle esplicite in UI, quando si farà la migrazione.

## D3 — Verdetto Gate #0: la Ricevuta è AGGREGATA → riconciliazione per conteggio

- **Decisione:** il parser reale della Ricevuta (PDF) estrae un riepilogo aggregato (`RicevutaSummary`: ID ricevuta, data invio, SCHEDINE INVIATE, struttura, questura…) e NON identità per-ospite. La riconciliazione T+1 si fonda sul CONTEGGIO: schedine attese per (credenziale, giorno) vs "SCHEDINE INVIATE" in ricevuta. Il port per-identità `AcquisitionReceiptReader` resta per i test mock; il redesign del reconcile su conteggio è follow-up dedicato.
- **Evidenza:** Gate #0 eseguito il 2026-06-10 con credenziali reali; ricevuta del 2026-03-25 (account RM034683) scaricata e analizzata: nessun nominativo ospite presente nel documento. Conferma la [SUPPOSIZIONE] di fragilità in docs/architettura §1.3 e la risolve.
- **Alternative:** (a) ricavare i nominativi da altri metodi WS — non esiste un metodo documentato che li restituisca; (b) OCR/parsing posizionale sperando in layout per-ospite — il documento semplicemente non li contiene.
- **Implicazione per gli omonimi (NEEDS-HUMAN #4):** il problema di collisione omonimi nella riconciliazione per-identità DECADE; con il conteggio, un mismatch (attese≠inviate) non è attribuibile alla singola schedina → l'intero batch del giorno va in NEEDS_REVIEW.
- **Implementazione:** `domain/ricevuta-summary.ts` (parser puro, tollera estrazione unpdf e pdftotext) + `adapters/ricevuta-pdf-text.ts` (estrazione testo via `unpdf`, serverless-ok). Test: 9 unit (fixture anonimizzata) + 2 locali sul PDF reale (skip automatico in CI: il PDF con PII resta fuori dal repo).
