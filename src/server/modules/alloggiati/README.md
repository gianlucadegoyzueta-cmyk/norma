# Modulo Alloggiati (cuore della compliance)

Responsabilità future (dettaglio in `docs/alloggiati-web-architettura.md`):

- **Token**: generazione/refresh "lazy" per credenziale; health-check con `Authentication_Test`;
  distinzione tra errori di autenticazione (→ re-onboarding) ed errori transitori (→ retry).
- **Outbox schedine**: ciclo `PENDING → SENDING → ACQUIRED/REJECTED/UNVERIFIED`; dedup-key;
  single-flight per credenziale; gestione del timeout (niente retry cieco).
- **Riconciliazione T+1**: download `Ricevuta`, match con le schedine `UNVERIFIED`/`ACQUIRED`.
- **Fallback PEC**: generazione del file TXT (tracciato) + procedura PEC alla Questura
  quando il portale è irraggiungibile entro la finestra 24h/6h.
- **Vault**: ottiene utente/password/wskey da `src/server/secrets`, mai dal DB in chiaro.

## Stato attuale

- **Client SOAP** (`soap/`): `GenerateToken`, `Authentication_Test`, `Test` e **`Send`** (acquisizione
  reale). Token gestiti da `TokenManager` (cache + refresh lazy + single-flight); segreti dal vault.
- **Invio** (`adapters/SoapAlloggiatiSender`): implementa il port `AlloggiatiSender` componendo
  `TokenManager` + client. Regola di sicurezza per l'IRREVERSIBILITÀ del `Send`: errori di
  rete/Fault e risposte ambigue (esito complessivo `false` o dettagli ≠ schedine inviate) NON
  vengono interpretati → l'outbox manda le schedine in `UNVERIFIED` (mai dedurre, mai retry cieco).
  ACQUIRED/REJECTED solo su risposta completa e 1:1.
- **Tabelle di riferimento** (`domain/reference`, `services/table-sync.service`): `TableSyncService`
  scarica via port `TabellaClient` i CSV (Comuni/Stati/Documenti/Tipi Alloggiato), li valida alle
  larghezze ufficiali dei codici e fa l'upsert idempotente in `Comune`/`Country`/`DocumentType`.
- **RecordBuilder reale** (`services/record-builder.service`): `SchedinaRecordBuilder.build(id)`
  carica ospite+soggiorno+immobile dal DB, risolve i codici (resolver) e serializza il tracciato
  (168/174). È cablato nell'outbox al posto del segnaposto; l'outbox salva il `payloadSnapshot`
  prima dell'invio e costruisce tutte le righe PRIMA di toccare lo stato (fail-fast).
- **Finestra di invio (data di arrivo)** — VERIFICATO empiricamente in Fase D contro il sistema reale:
  Alloggiati accetta una schedina **solo se la data di arrivo è OGGI o IERI** (calendario italiano,
  `Europe/Rome`); date più vecchie o nel futuro → `cod. 12 "Data di Arrivo Errata"`. Cablata nel
  dominio `stays` (`computeSendWindow` / `isArrivalWithinSendWindow`, accanto a `computeSchedinaDeadline`)
  e applicata in `StaysService.generateSchedine`: un soggiorno fuori finestra **non genera schedine**
  (errore chiaro), invece di produrre PENDING destinate a un rifiuto certo. Altri esiti Fase D:
  padding giorni (`"03"`), accenti e minuscole **accettati**; larghezze codici 9/9/5 OK.

### ⚠️ Le tabelle di riferimento nascono VUOTE

In produzione `Comune`/`Country`/`DocumentType` sono **vuote** finché non si esegue `TableSyncService`
con **credenziali Alloggiati reali**. Il prodotto è installato e funzionante, ma **NON può risolvere
Comuni/Stati/Documenti — quindi non può generare schedine reali — finché non si sincronizza**.
Usa `checkReferenceTablesHealth(repo)` per accorgertene (ritorna `ready:false` + messaggio chiaro).
Disciplina: **non** si popolano dati finti in produzione; vuoto resta vuoto finché non si sincronizza
dal vero. I CSV di esempio (`FakeTabellaClient`) servono SOLO a test/sviluppo.

### Da fare (prossimi passi)

- **Sincronizzazione tabelle**: formato **VERIFICATO** sul servizio reale (2026-05). Enum `TipoTabella` =
  `Luoghi`/`Tipi_Documento`/`Tipi_Alloggiato`(+`TipoErrore`,`ListaAppartamenti`); risposta `Tabella` =
  `TabellaResult`+`CSV`(stringa); `Luoghi` ha intestazione e combina Comuni (Provincia=sigla) e Stati
  esteri (Provincia=="ES") → `parseLuoghiCsv` li splitta. Diagnostica read-only: `npm run alloggiati:inspect-tables`.
- **`Ricevuta` + riconciliazione T+1**: struttura della risposta da verificare sul servizio reale
  (non la fabbrichiamo a tavolino).
- **Fallback PEC**.

## Onboarding prima struttura reale (checklist)

Sequenza **graduale**, una fase alla volta. **REGOLA D'ORO: non si arriva MAI al `Send` reale senza
una conferma esplicita scritta.** Alloggiati non permette correzioni: una schedina inviata è
permanente. Ci si ferma alla fine di ogni fase e si controlla l'output prima di avanzare.

Prima di OGNI script che tocca il sistema reale compare un banner con ~5 secondi per annullare
(Ctrl-C). Doppio gate di sicurezza: le operazioni live partono solo se ci sono le credenziali nel
`.env` **e** il flag esplicito impostato dallo script npm → un normale `npm test` non chiama mai
il sistema reale.

### Fase A — Credenziali nel `.env`
Aggiungi al `.env` locale (MAI committato: `.env` è in `.gitignore`):
```
ALLOGGIATI_UTENTE="..."
ALLOGGIATI_PASSWORD="..."
ALLOGGIATI_WSKEY="..."
```

### Fase B — Live-check (Token + Test, NIENTE Send)
- **Comando:** `npm run alloggiati:live-check`
- **Fa:** GenerateToken → probe idempotenza token → Authentication_Test → `Test` su una schedina di
  esempio (codici placeholder), con report dettagliato. Mai `Send`.
- **Scopo:** confermare che le credenziali funzionano e leggere i **codici di errore reali**.
- ⏸ **STOP** — si guarda l'output insieme.

### Fase C — Sincronizzazione tabelle
- **Comando:** `npm run alloggiati:sync-tables`
- **Fa:** scarica `Luoghi` (Comuni + Stati esteri, splittati su Provincia=="ES") + `Tipi_Documento`
  via `Tabella` e popola `Comune`/`Country`/`DocumentType` (upsert idempotente). Mai `Send`.
- **Scopo:** avere i **codici veri** per costruire una schedina valida a tutti gli effetti.
- ⏸ **STOP** — l'health-check deve passare a `ready: true`.

### Fase D — Test con DATI REALI (ancora NIENTE Send)
- Solo dopo che A + B + C sono OK e gli output sono stati visti.
- Si rifà il `Test` su una schedina costruita con **codici reali** (dalle tabelle appena
  sincronizzate) + un **ospite di esempio** della struttura.
- **Scopo:** verificare empiricamente i 4 punti aperti del tracciato (padding giorni,
  maiuscole/accenti, larghezza codici, ID appartamento) e la mappatura dei codici errore.
- Lo assembliamo **insieme** a questo punto (servono i dati reali della struttura e i codici
  sincronizzati). Riusa lo stesso percorso `Test`, **mai `Send`**.
- ⏸ **STOP.**

### Fase E — STOP prima del Send
Il `Send` reale (**irreversibile**) NON parte senza una conferma esplicita scritta:
> "ok procedi col Send reale"

Lo decidiamo insieme dopo aver visto i risultati del `Test`.
