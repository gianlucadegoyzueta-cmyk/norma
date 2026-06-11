# Ricerca — ISTAT movimento turistico via ROSS 1000 (Regione Lazio)

> Studio pre-sviluppo per l'automazione dell'invio mensile ISTAT del movimento turistico
> tramite il portale regionale del Lazio (ROSS 1000).
> Data: 2026-06-11. Unità di ricerca della flotta Norma — solo documentazione, nessun codice.
> Le fonti primarie (tracciato XML/web service ufficiale, FAQ Regione Lazio, avviso regionale)
> sono state lette/verificate direttamente (PDF scaricati e parsati).

## Legenda affidabilità fonti

- **[UFF✓]** = fonte ufficiale (Regione Lazio / GIES, operatore tecnico) letta/verificata direttamente in questa ricerca.
- **[UFF]** = fonte ufficiale citata, non riletta integralmente.
- **[COMMUNITY]** = fonte non ufficiale (gestionali, blog di settore, associazioni) — utile per la prassi, non per il dettaglio normativo.
- **[DA VERIFICARE]** = punto non confermato da fonte ufficiale; da accertare empiricamente o con l'Ufficio Turismo.

---

## Verdetto (3 righe)

1. **Automazione fattibile, sì.** Il Lazio espone un **web service SOAP ufficiale** (piattaforma GIES "turismo5", la stessa di molte altre regioni) per la trasmissione programmatica del movimento turistico: endpoint `https://lazioturismo.ross1000.it/ws/checkinV2?wsdl`, operazione `inviaMovimentazione`, autenticazione **HTTP Basic**. **[UFF✓]**
2. **Il tracciato è PER-OSPITE E PER-GIORNO, non aggregato.** A differenza dell'export mensile arrivi/presenze che Norma produce oggi (`istat/domain/export-csv.ts`), ROSS 1000 vuole un XML con un `<movimento>` per ogni giorno di attività e, dentro, i singoli `<arrivo>`/`<partenza>` con anagrafica ospite. **La buona notizia:** sono gli stessi dati (e le stesse tabelle Polizia di Stato — Comuni, Nazioni, Tipi Alloggiato) che Norma già raccoglie per le schedine Alloggiati Web. Forte sinergia col modulo `alloggiati`. **[UFF✓]**
3. **Multi-tenant come per Alloggiati:** non esiste un modello "API partner". Servono le credenziali di trasmissione (username+password) **di ogni struttura**, da custodire nel `SecretsVault`. L'accesso al portale è via **SPID** (personale del gestore), ma la trasmissione automatizzata usa credenziali utente dedicate via HTTP Basic, da attivare presso l'Ufficio Turismo per le utenze SPID/CIE. **[UFF✓]**

---

## 1. Chi gestisce ROSS 1000 nel Lazio

- **Titolare del dato / ente preposto:** **Regione Lazio**, Direzione Regionale Turismo (sezione "Studi, Innovazione e Statistica"). ROSS 1000 è il sistema informativo regionale per la rilevazione dei flussi turistici a fini ISTAT. **[UFF]** — https://www.regione.lazio.it/cittadini/turismo/studi-innovazione-statistica
- **Operatore tecnico / software house della piattaforma:** **GIES S.r.l.** (Repubblica di San Marino — domini `gies.sm` / `gies.it`), piattaforma applicativa **"turismo5"**. Lo si deduce in modo univoco dal namespace SOAP (`http://checkin.ws.service.turismo5.gies.it/`), dagli endpoint `turismo5-web`, dalle tabelle NUTS distribuite da `gies.it` e dalla mail di assistenza `lazioturismo@gies.sm`. **[UFF✓]**
- **ROSS 1000** = "Rilevazione Ottimizzata delle Statistiche sul Turismo"; è una piattaforma adottata da numerose regioni italiane (vedi §3.4), scelta in ambito Ministero del Turismo per standardizzare la raccolta dei flussi. **[COMMUNITY]** — https://www.ross1000.it/
- **Portale Lazio:** https://lazioturismo.ross1000.it/ **[UFF✓]**

### Contesto normativo e cronologia

- **Sostituzione di RADAR:** dal **21 maggio 2025** ROSS 1000 è l'**unico canale** ammesso nel Lazio per la trasmissione dei flussi turistici ISTAT; RADAR è dismesso. Avviso regionale con **Determinazione Dirigenziale n. G05446 del 5 maggio 2025**. **[UFF]**
  - Avviso Regione Lazio (avvio applicativo, maggio 2025): https://www.regione.lazio.it/sites/default/files/documentazione/2025/avvio-applicativo-flussi-Ross1000-maggio-2025.pdf **[UFF]**
  - Comunicazione del Comune di Viterbo (decorrenza 21/05/2025): https://comune.viterbo.it/novita/nuove-modalita-di-trasmissione-flussi-turistici-da-parte-delle-strutture-ricettive-e-alloggi-per-uso-turistico-del-lazio-lavviso-della-regione-lazio-con-decorrenza-21-maggio-2025/ **[COMMUNITY]**
- **Base normativa della rilevazione:** D.M. 7 gennaio 2013 (comunicazione alloggiati alla P.S.); Regolamento CE n. 692/2011; Programma Statistico Nazionale "Rilevazione tipologia e caratteristiche dei clienti negli esercizi ricettivi" (codice EMR00028). **[UFF✓ — premessa tracciato XML]**
- **CIR / CIN:** la struttura ottiene il **CIR** (Codice Identificativo Regionale, formato `123456-AAA-12345`) dall'anagrafica ROSS 1000; il **CIN** si richiede poi sulla Banca Dati Strutture Ricettive del Ministero (https://bdsr.ministeroturismo.gov.it/) con SPID, partendo dal CIR. **[UFF✓ — FAQ Lazio, q.1 e q.5]**

---

## 2. Credenziali: come si ottengono

### 2.1 Accesso al portale (uso umano)

- L'accesso a `lazioturismo.ross1000.it` avviene **esclusivamente via SPID** (identità del gestore della struttura). **[UFF✓ / COMMUNITY confermato]**
- **Strutture già in RADAR:** pulsante **"RECUPERA CREDENZIALI ROSS1000"** → si inserisce lo username RADAR e si recupera l'accesso (procedura via SPID). Le vecchie credenziali RADAR non servono più. **[UFF✓ — FAQ recupero]**
- **Strutture nuove (senza CIR):** pulsante **"REGISTRA UNA NUOVA STRUTTURA"** (auto-registrazione). Richiede: dati SCIA/CIA, consistenza (camere/letti/bagni come da pratica), tipologia ricettiva, allegati documentali completi. A fine procedura si ottiene il CIR. **[UFF✓ — FAQ auto-registrazione, doc 19/09/2024]**
  - FAQ auto-registrazione (Regione Lazio, 19/09/2024): https://www.regione.lazio.it/sites/default/files/2024-11/ROSS1000_Domande_Frequenti.pdf **[UFF✓]**
  - Linee guida iscrizione strutture ricettive (Regione Lazio, 09/2025): https://www.regione.lazio.it/sites/default/files/2025-09/Linee-guida-iscrizione-strutture-ricettive.pdf **[UFF]**

### 2.2 Credenziali di TRASMISSIONE (uso macchina — quelle che servono a Norma)

- Il web service **non** usa SPID: usa **username + password** in **HTTP Basic** (vedi §3.1). **[UFF✓ — tracciato §"Autenticazione"]**
- Nota ufficiale del tracciato: _"la suddetta modalità di autenticazione resta valida anche per le installazioni che hanno adottato SPID/CIE per l'accesso alla procedura. In questi casi può essere necessario consultare l'Ufficio Turismo di competenza per l'attivazione di nuove credenziali di trasmissione."_ **[UFF✓]**
  - **Implicazione operativa per Norma:** per ogni struttura cliente nel Lazio si dovrà ottenere/attivare una coppia username+password di trasmissione (verosimilmente richiedendola all'Ufficio Turismo regionale / assistenza GIES). **Questa è la dipendenza di onboarding da chiarire per prima.** **[DA VERIFICARE — modalità esatta di rilascio delle credenziali WS nel Lazio]**
- Il `<codice>` da mettere nell'XML è il **codice identificativo della struttura assegnato dall'ente** (negli esempi GIES tipo `A00927P`, `B01205`); **da verificare** se nel Lazio coincide col CIR o con un codice struttura interno ROSS 1000. **[DA VERIFICARE]**

### 2.3 Contatti di supporto

- **Assistenza tecnica piattaforma (GIES):** `lazioturismo@gies.sm` **[UFF✓ — FAQ q.6]**
- **Riferimento regionale credenziali/anagrafiche:** `bancadatiturismolazio@regione.lazio.it` **[UFF✓]**
- **Legacy RADAR (transitorio):** `supportoradar@visitlazio.com` **[UFF✓ — FAQ q.12]**

---

## 3. Canali e formati di invio

ROSS 1000 accetta tre modalità; per l'automazione interessa la prima.

### 3.1 Web service SOAP (canale per Norma) **[UFF✓]**

- **Endpoint Lazio:** `https://lazioturismo.ross1000.it/ws/checkinV2?wsdl`
- **Operazione SOAP:** `inviaMovimentazione`, namespace `http://checkin.ws.service.turismo5.gies.it/`. Il body contiene un elemento `<movimentazione>` con la stessa struttura del file XML (vedi §4).
- **Autenticazione:** **HTTP Basic** — header `Authorization: Basic base64("username:password")`. Esempio dal manuale: `Authorization: Basic TXlVc2VybmFtZTpNeVBhc3N3b3Jk`.
- **Esempio di envelope SOAP** (dal tracciato ufficiale):

  ```xml
  <?xml version="1.0"?>
  <S:Envelope xmlns:S="http://schemas.xmlsoap.org/soap/envelope/">
    <S:Body>
      <ns2:inviaMovimentazione xmlns:ns2="http://checkin.ws.service.turismo5.gies.it/">
        <movimentazione>
          <codice>B01205</codice>
          <prodotto>Xxxxxxxx</prodotto>
          <movimento> … </movimento>
        </movimentazione>
      </ns2:inviaMovimentazione>
    </S:Body>
  </S:Envelope>
  ```

> SOAP legacy, come Alloggiati Web. Norma ha già esperienza di client SOAP a stringa nel modulo `alloggiati`; qui il payload è XML strutturato (più pulito del tracciato a larghezza fissa della Questura).

### 3.2 Upload file XML / TXT (manuale assistito) **[UFF✓ / COMMUNITY]**

- Dal portale si può caricare un file `.xml` (tracciato §4) o `.txt` (tracciato legacy a record). Entrambi i formati sono validi; l'XML è la versione più recente e include apertura/chiusura e disponibilità giornaliera. Utile come **fallback** se il WS è giù.

### 3.3 Inserimento manuale a video **[COMMUNITY]**

- Compilazione diretta del movimento mensile (arrivi/presenze per provenienza italiana/estera) nel portale. È il flusso "a mano" che Norma vuole evitare al cliente.

### 3.4 Nota: piattaforma multi-regione (stesso tracciato) **[UFF✓]**

Lo stesso web service `checkinV2` è esposto da molte regioni (endpoint base diverso, tracciato identico). Estratto dalla lista ufficiale endpoint del tracciato:

| Regione                      | Endpoint web service                                                           |
| ---------------------------- | ------------------------------------------------------------------------------ |
| **Lazio**                    | `https://lazioturismo.ross1000.it/ws/checkinV2?wsdl`                           |
| Toscana (CM Firenze, PT, PO) | `https://toscanaturismo.ross1000.it/turismo5-web/ws/checkinV2?wsdl`            |
| Sardegna                     | `https://sardegnaturismo.ross1000.it/ws/checkinV2?wsdl`                        |
| Molise                       | `https://moliseturismo.ross1000.it/ws/checkinV2?wsdl`                          |
| Veneto                       | `https://flussituristici.regione.veneto.it/ws/checkinV2?wsdl`                  |
| Emilia-Romagna               | `https://datiturismo.regione.emilia-romagna.it/ws/checkinV2?wsdl`              |
| Lombardia                    | `https://www.flussituristici.servizirl.it/Turismo5/app/ws/checkinV2?wsdl`      |
| Marche                       | `https://istrice-ross1000.turismo.marche.it/ws/checkinV2?wsdl`                 |
| Piemonte                     | `https://piemontedatiturismo.regione.piemonte.it/ws/checkinV2?wsdl`            |
| Abruzzo                      | `https://app.regione.abruzzo.it/Turismo5/ws/checkinV2?wsdl`                    |
| Liguria                      | `https://turismows.regione.liguria.it/ws/checkinV2?wsdl`                       |
| Calabria                     | `https://sirdat.regione.calabria.it/ws/checkinV2?wsdl`                         |
| Basilicata                   | `https://sist-aptbasilicata.turitweb.it/ws/checkinV1?wsdl` (nota: `checkinV1`) |

> **Implicazione strategica:** un adapter ROSS 1000 ben fatto, parametrizzato sull'endpoint base, copre il Lazio **e** ~12 altre regioni con lo stesso codice. Architetturalmente l'endpoint è una config per-regione; le credenziali sono per-struttura.

---

## 4. Tracciato XML (dettaglio tecnico)

Fonte primaria: **"Tracciato record di integrazione dati (XML) — Istruzioni per le software house", Versione 3, 18/03/2026** (GIES). **[UFF✓ — letto integralmente]**

- https://www.ross1000.it/source/tracciato-xml.pdf **[UFF✓]**
- Variante con sezione web service: https://web.gies.sm/cc_allegati/ross1000/Tracciato_XML-WEBSERVICE-2.4.pdf **[UFF]**

### 4.1 Struttura generale

- File **XML 1.0, codifica UTF-8**.
- Radice `<movimenti>` con due campi obbligatori:
  - `<codice>` — codice identificativo della struttura (assegnato dall'ente; §2.2).
  - `<prodotto>` — descrizione del software gestionale che produce il file (es. `"Norma"`).
- Dentro, uno o più `<movimento>`, **uno per ogni giorno di attività**, in ordine di data crescente. Ogni `<movimento>` contiene:
  - `<data>` obbligatorio, formato **`aaaammgg`** (anno 4 cifre, mese/giorno 2 cifre, senza separatori).
  - `<struttura>` obbligatorio (stato di attività del giorno).
  - opzionali: `<arrivi>`, `<partenze>`, `<prenotazioni>`, `<rettifiche>`.
- **Obiettivo dichiarato:** una comunicazione di movimento per **tutti** i giorni dell'anno, **inclusi i giorni di chiusura** (per registrare i giorni effettivi di apertura). I numeri sono senza separatore migliaia, punto `.` per i decimali.

### 4.2 `<struttura>` (sempre 4 campi, sempre valorizzati)

| Campo                 | Significato                                    |
| --------------------- | ---------------------------------------------- |
| `<apertura>`          | `"SI"` se aperta quel giorno, `"NO"` se chiusa |
| `<camereoccupate>`    | n. camere occupate nel giorno                  |
| `<cameredisponibili>` | n. unità ricettive vendibili                   |
| `<lettidisponibili>`  | n. persone ospitabili                          |

> Se `apertura = "NO"`, gli altri tre campi vanno a `0`.

### 4.3 `<arrivi>` → `<arrivo>` (un check-in = un ospite)

Campi (obbligatori salvo nota):

| Campo                        | Note                                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `idswh`                      | **ID univoco del check-in** (max 20 char), obbligatorio. Stabile nel tempo a prescindere dalle modifiche; è la chiave per correggere/eliminare. |
| `tipoalloggiato`             | codice tipo alloggiato (tabella P.S.), obbligatorio                                                                                             |
| `idcapo`                     | obbligatorio se `tipoalloggiato` è 19 o 20 (capofamiglia/capogruppo); coincide con l'`idswh` del capo                                           |
| `cognome` (50) / `nome` (30) |                                                                                                                                                 |
| `sesso`                      | `M`/`F`, obbligatorio                                                                                                                           |
| `cittadinanza`               | codice stato (tabella Nazioni), obbligatorio                                                                                                    |
| `statoresidenza`             | codice stato, obbligatorio (`100000100` = Italia)                                                                                               |
| `luogoresidenza`             | obbligatorio **solo se** `statoresidenza = 100000100` → codice comune italiano; per stranieri: codice NUTS (europei) o stringa libera max 30    |
| `datanascita`                | `aaaammgg`, obbligatorio                                                                                                                        |
| `statonascita`               | codice stato                                                                                                                                    |
| `comunenascita`              | codice comune italiano **solo se** `statonascita = 100000100`, altrimenti vuoto                                                                 |
| `tipoturismo`                | obbligatorio — enum (§4.7)                                                                                                                      |
| `mezzotrasporto`             | obbligatorio — enum (§4.7)                                                                                                                      |
| `canaleprenotazione`         | enum (§4.7)                                                                                                                                     |
| `titolostudio`               | enum (§4.7)                                                                                                                                     |
| `professione`                | descrizione                                                                                                                                     |
| `esenzioneimposta`           | codice esenzione imposta di soggiorno (richiesto per comune)                                                                                    |

> Se le regole di obbligatorietà non sono rispettate, **l'ospite viene scartato** (silenziosamente rispetto al resto del movimento). Le **correzioni** si fanno re-inviando il `<movimento>` del giorno di arrivo dell'ospite (idem per le date partenza: re-invio del giorno di partenza).

### 4.4 `<partenze>` → `<partenza>`

`idswh` (= quello dell'arrivo) + `tipoalloggiato` + `arrivo` (`aaaammgg`). Riferite al giorno del `<movimento>` che le contiene.

### 4.5 `<prenotazioni>` → `<prenotazione>`

`idswh`, `arrivo`, `partenza`, `ospiti`, `camere`, `prezzo` (€/persona/giorno), `canaleprenotazione`, `statoprovenienza`, `comuneprovenienza`. **Opzionale** ai fini ISTAT del movimento — Norma può ometterle nella v1.

### 4.6 `<rettifiche>` (opzionale) — qui c'è l'annullamento

A differenza di Alloggiati Web (che NON ha annullamento), ROSS 1000 lo prevede:

- `<eliminazione>`: elimina dall'archivio un ospite o prenotazione (`idswh` + `tipoalloggiato` o `99` per prenotazione + `arrivo`).
- `<cancellazione>`: marca una prenotazione come cancellata (amministrativamente), senza eliminarla.
- `<conferma>`: conferma una prenotazione.

> **Vantaggio rispetto ad Alloggiati:** il modello idempotente è gestibile via `idswh` univoco + re-invio del movimento. Un errore di invio si corregge ritrasmettendo lo stesso giorno con `idswh` invariato.

### 4.7 Tabelle di codifica

- **Comuni / Nazioni / Tipi Alloggiato:** sono le **stesse tabelle della Polizia di Stato** usate per Alloggiati Web → https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/Tabelle.aspx **[UFF✓]**. **Norma le ha già** (modulo `alloggiati`).
- **NUTS (residenza esteri europei):** https://www.gies.it/Turismo/nuts-gies2020.zip **[UFF✓]**
- **Enum testuali accettati** (stringhe esatte):
  - **tipoturismo:** Culturale, Balneare, Congressuale/Affari, Fieristico, Sportivo/Fitness, Scolastico, Religioso, Sociale, Parchi Tematici, Termale/Trattamenti salute, Enogastronomico, Cicloturismo, Escursionistico/Naturalistico, Altro motivo, Non Specificato.
  - **mezzotrasporto:** Auto, Aereo, Aereo+Pullman, Aereo+Navetta/Taxi/Auto, Aereo+Treno, Treno, Pullman, Caravan/Autocaravan, Barca/Nave/Traghetto, Moto, Bicicletta, A piedi, Altro mezzo, Non specificato.
  - **canaleprenotazione:** Diretta tradizionale, Diretta web, Indiretta tradizionale, Indiretta web, Altro canale, Non specificato.
  - **titolostudio:** Licenza elementare, Diploma, Laurea, Altro titolo, Non specificato.

---

## 5. Cosa serve a Norma per automatizzare l'invio mensile

### 5.1 Dati: Norma li ha già (quasi tutti)

La rilevazione ISTAT di Norma oggi (`src/server/modules/istat/`) aggrega **arrivi/presenze per provenienza** su base mensile (`domain/aggregate.ts`, export CSV). **ROSS 1000 web service NON accetta questo aggregato:** vuole il **dettaglio giornaliero per-ospite**. Ma quel dettaglio Norma lo possiede già, perché è lo **stesso dataset delle schedine Alloggiati Web** (anagrafica ospite, cittadinanza, residenza, date soggiorno, tipo alloggiato), già codificato con le tabelle P.S.

**Mappatura concettuale (Norma → tracciato):**

| Tracciato ROSS 1000                    | Sorgente in Norma                                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `<codice>`                             | codice struttura ROSS 1000 / CIR (nuovo campo per `Property`/org) — **da raccogliere in onboarding**        |
| `<prodotto>`                           | costante `"Norma"`                                                                                          |
| `<movimento><data>`                    | giorni del periodo (un nodo per giorno, anche di chiusura)                                                  |
| `<struttura>` (apertura, camere/letti) | **dato nuovo:** disponibilità/apertura giornaliera per struttura — **non presente oggi** in Norma (vedi §6) |
| `<arrivo>` (anagrafica)                | check-in ospite (stesso modello delle schedine `alloggiati`/`checkin`)                                      |
| `<partenza>`                           | data partenza del soggiorno                                                                                 |
| codici comune/nazione/tipo alloggiato  | tabelle P.S. già integrate                                                                                  |

### 5.2 Lavoro stimato (alto livello, da raffinare in spec di implementazione)

1. **Onboarding:** raccogliere per ogni struttura Lazio il **codice ROSS 1000/CIR** e le **credenziali di trasmissione** (username+password WS) → `SecretsVault`. Chiarire con l'Ufficio Turismo/GIES come si emettono le credenziali WS (§2.2). **[bloccante]**
2. **Nuovo adapter `istat/adapters/ross1000-soap.ts`** (ports/adapters): client SOAP per `inviaMovimentazione`, HTTP Basic, endpoint per-regione configurabile. Riuso del pattern client SOAP del modulo `alloggiati`.
3. **Nuovo builder di dominio `istat/domain/ross1000-movimenti.ts`** (PURO): da soggiorni+ospiti del periodo → albero `<movimenti>` giornaliero. Genera `idswh` stabile per check-in. Test con fixture anonimizzate.
4. **Dato "disponibilità/apertura giornaliera"** (camere occupate/disponibili, letti): decidere la fonte (campo struttura statico + occupazione calcolata dai soggiorni). Vedi §6.1.
5. **Outbox + invio mensile** (entro il 5 del mese successivo) riusando il pattern outbox esistente (Send non idempotente, ma qui correggibile via re-invio con `idswh`).
6. **Fallback upload XML** (riuso del builder) per quando il WS è giù.

### 5.3 Cosa NON serve

- Niente certificati digitali. Niente SPID lato server (SPID è solo per l'accesso umano al portale).
- Niente nuove tabelle di codifica: si riusano quelle Polizia di Stato già in casa.

---

## 6. Rischi e punti aperti

1. **Dato "consistenza giornaliera" (`<struttura>`) mancante.** Norma oggi non modella camere occupate/disponibili/letti per giorno. `cameredisponibili`/`lettidisponibili` sono attributi quasi-statici della struttura (da SCIA/CIA, già richiesti in registrazione ROSS 1000); `camereoccupate` è derivabile dai soggiorni. **Va aggiunto un campo struttura** (consistenza) e una piccola logica di occupazione. **[progettuale]**
2. **Rilascio credenziali di trasmissione WS nel Lazio: procedura non documentata pubblicamente.** Il tracciato dice "consultare l'Ufficio Turismo"; va verificato il flusso reale (self-service dal portale? richiesta via mail a `lazioturismo@gies.sm`/`bancadatiturismolazio@regione.lazio.it`?). **[DA VERIFICARE — bloccante onboarding]**
3. **Identità del `<codice>`.** Da confermare se è il CIR o un codice struttura ROSS 1000 distinto. **[DA VERIFICARE]**
4. **Scarto silenzioso degli ospiti non conformi.** Un `<arrivo>` con campi obbligatori mancanti viene scartato senza bloccare il resto: serve validazione lato Norma **prima** dell'invio (riuso della validazione anagrafica già fatta per le schedine) + riconciliazione/ricevuta per contare quanti record sono stati acquisiti. **[DA VERIFICARE — esiste una ricevuta/risposta del WS con conteggio acquisiti/scartati?]**
5. **Versionamento tracciato:** v3 del 18/03/2026 è recentissima; l'endpoint è `checkinV2` (Basilicata ancora `checkinV1`). Tenere l'adapter tollerante alle differenze regionali.
6. **Scadenza e sanzioni:** invio consigliato giornaliero, **obbligo entro il giorno 5 del mese successivo**; **vanno dichiarati anche i mesi a zero presenze**. Sanzioni amministrative citate fino a **€2.500/mese** di omissione/inesattezza (fonte secondaria, da verificare con la norma regionale). **[COMMUNITY — verificare entità sanzione]**

---

## 7. Raccomandazione

- **Procedere con un adapter ROSS 1000 web service**, in coda al P2 della roadmap (ISTAT invio regionale reale). Lo sblocco è **chiarire il rilascio delle credenziali di trasmissione** (§6.2) — task da NEEDS-HUMAN, richiede un contatto reale con l'Ufficio Turismo/GIES e una struttura reale nel Lazio per il primo test.
- **Riusare il dominio anagrafico di `alloggiati`/`checkin`**: l'80% dei dati e tutte le tabelle di codifica ci sono già. Il nuovo lavoro è il builder giornaliero `<movimenti>`, il dato di consistenza struttura, e il client SOAP.
- **Tenere l'endpoint parametrico per-regione:** lo stesso codice abilita ~13 regioni ROSS 1000, non solo il Lazio.
- **Nessun invio reale come prova** senza decisione esplicita di Gianluca e struttura/credenziali reali (coerente col guardrail #1 stile Alloggiati). Il WS GIES non offre un metodo `Test` documentato come quello della Questura: il primo invio va fatto con dati reali di una struttura reale, quindi con cautela.

---

## Appendice — Elenco fonti

**Ufficiali primarie [UFF✓ — lette in questa ricerca]**

- Tracciato XML/web service ROSS 1000, v3, 18/03/2026 (GIES): https://www.ross1000.it/source/tracciato-xml.pdf
- Tracciato XML-WEBSERVICE 2.4 (variante con sezione WS): https://web.gies.sm/cc_allegati/ross1000/Tracciato_XML-WEBSERVICE-2.4.pdf
- FAQ ROSS 1000 — auto-registrazione, Regione Lazio, 19/09/2024: https://www.regione.lazio.it/sites/default/files/2024-11/ROSS1000_Domande_Frequenti.pdf
- Tabelle codifica Polizia di Stato (Comuni/Nazioni/Tipi Alloggiato): https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/Tabelle.aspx
- Tabelle NUTS GIES 2020: https://www.gies.it/Turismo/nuts-gies2020.zip
- Portale ROSS 1000 Lazio (login/registrazione): https://lazioturismo.ross1000.it/

**Ufficiali [UFF]**

- Avviso Regione Lazio — avvio applicativo ROSS 1000 (maggio 2025): https://www.regione.lazio.it/sites/default/files/documentazione/2025/avvio-applicativo-flussi-Ross1000-maggio-2025.pdf
- Linee guida iscrizione strutture ricettive, Regione Lazio (09/2025): https://www.regione.lazio.it/sites/default/files/2025-09/Linee-guida-iscrizione-strutture-ricettive.pdf
- Regione Lazio — Turismo, Studi/Innovazione/Statistica: https://www.regione.lazio.it/cittadini/turismo/studi-innovazione-statistica
- Portale nazionale ROSS 1000: https://www.ross1000.it/

**Community / settore [COMMUNITY]**

- Comune di Viterbo — nuove modalità trasmissione flussi (decorrenza 21/05/2025): https://comune.viterbo.it/novita/nuove-modalita-di-trasmissione-flussi-turistici-da-parte-delle-strutture-ricettive-e-alloggi-per-uso-turistico-del-lazio-lavviso-della-regione-lazio-con-decorrenza-21-maggio-2025/
- Chekin — guida ROSS 1000 Lazio 2026 (scadenze/sanzioni): https://chekin.com/it/blog/ross1000-lazio/
- Wiisy — ROSS 1000 unico canale flussi ISTAT Lazio: https://wiisy.app/regione-lazio-ross1000-unico-canale-comunicazione-dei-flussi-turistici-istat/
- FAQ rilevazioni turismo Emilia-Romagna (riferimento tecnico cross-regione): https://statistica.regione.emilia-romagna.it/metadati/rilevazioni/turismo/allegati-rilevazioni-turismo/manuali-e-tracciati-rilevazioni-turismo/faq-rilevazioni-turismo
