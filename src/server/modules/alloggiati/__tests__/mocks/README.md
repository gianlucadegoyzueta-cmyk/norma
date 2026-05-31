# Mock server Alloggiati Web (solo test)

Mock SOAP fedele dell'endpoint Alloggiati Web (Polizia di Stato), per collaudare l'intero flusso
di invio schedine **senza mai toccare il sistema reale**. È codice di **solo test**: non è esportato
dall'`index` del modulo e non finisce nel bundle di produzione.

## Come si usa

Il client di produzione `AlloggiatiSoapClient` accetta un `fetchImpl` iniettabile. Il mock espone
proprio una `fetch` che parla SOAP 1.1, quindi tutto lo stack reale gira invariato:

```ts
const mock = new AlloggiatiMockServer(SECRET, { today: "2026-05-30" });
const client = new AlloggiatiSoapClient({ fetchImpl: mock.fetch });
// ...oppure usa createAlloggiatiStack(...) (harness.ts) per l'intera catena outbox/verify.
```

- `AlloggiatiMockServer.ts` — il server SOAP finto (stateful: credenziali, token, registro acquisizioni
  per-giorno, `Ricevuta`).
- `harness.ts` — cabla lo stack di produzione (TokenManager → client → sender → outbox/verify/reconcile) sul mock.
- `MockReceiptReader.ts` — adapter di test del port `AcquisitionReceiptReader`: chiama il `Ricevuta`
  reale via client SOAP e decodifica il payload [MOCK] (vedi sotto).
- `../alloggiati-mock-server.e2e.test.ts` — suite end-to-end su tutti gli scenari (incl. riconciliazione T+1).

## Cosa replica fedelmente (sulla base del codice/manuale REALI)

- Firme/nomi dei metodi SOAP: `GenerateToken`, `Authentication_Test`, `Test`, `Send`, `Tabella`
  (namespace `AlloggiatiService`, SOAPAction `AlloggiatiService/<Metodo>`).
- Forma di richiesta/risposta, inclusa la struttura per-riga
  `result{ SchedineValide, Dettaglio{EsitoOperazioneServizio[]} }` e la doppia capitalizzazione
  del manuale (`esito` minuscolo, `ErroreCod/ErroreDes/ErroreDettaglio`).
- I **due soli codici di errore ufficialmente attestati** nel manuale WS, **derivati dal record reale**:
  - `11 SCHEDINA_FORMATO_NON_CORRETTO` — lunghezza riga != 168/174.
  - `12 SCHEDINA_CAMPO_NON_CORRETTO` — Data di Arrivo fuori finestra (oggi/ieri).
- Trasporto: timeout (AbortController), HTTP 500, SOAP Fault → mappati negli errori reali del client.

## Limiti onesti (cosa NON è coperto)

- **Catalogo errori incompleto.** Nel repo esistono solo i codici `11`/`12` (ufficiali) e `1`
  (solo in una fixture, non confermato dal manuale). La tabella completa `TipoErrore` non è mappata:
  i rifiuti con altri codici si passano dal test via `rejectRow`, con codici marcati `[MOCK]`.
- **Doppio invio: comportamento del server reale ignoto.** Testarlo davvero creerebbe doppioni
  irreversibili. Il mock tiene un registro `acquired` solo per **asserire** quante volte una riga è
  arrivata al server; i test verificano la **protezione lato nostro** (la macchina a stati non
  re-invia mai una schedina già ACQUIRED/UNVERIFIED), non un comportamento del server non documentato.
- **Ricevuta / riconciliazione T+1: modellate, ma con un PDF [MOCK].** Il metodo `Ricevuta` ora è
  simulato fedelmente nei suoi VINCOLI reali (token valido; **solo giorni passati** → oggi/futuro
  rifiutato) e alimenta il `SchedinaReconcileService`: un `UNVERIFIED` confermato dalla ricevuta del
  giorno → `ACQUIRED`, altrimenti → `PENDING` (re-inviabile senza doppioni). ⚠️ Il **contenuto del PDF
  reale è ignoto/non documentato**: il mock NON simula un PDF, ma un payload base64 di righe nominative
  (`cognome\tnome\tdataNascita`) — il contenuto utile che un adapter reale dovrebbe comunque estrarre.
  La lettura/parsing del PDF è isolata dietro il port `AcquisitionReceiptReader`: in produzione va
  sostituita con un parser del PDF vero, **una volta verificato il formato sul campo**.
- **Validazione delle tabelle (Comuni/Stati/Documenti) non semantica.** Il mock controlla la
  _forma_ del record (lunghezza, finestra data), non la validità dei singoli codici contro le
  tabelle ufficiali (il server reale lo fa; qui i codici di esempio sono placeholder a larghezza giusta).
- **`Tabella` restituisce un CSV fittizio**, sufficiente solo a non far fallire un parsing.
