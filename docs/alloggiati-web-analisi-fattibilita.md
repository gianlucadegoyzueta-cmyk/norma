# Analisi di fattibilità tecnica — Integrazione ALLOGGIATI WEB

> Studio pre-sviluppo per SaaS multi-tenant di compliance affitti brevi (IT).
> Data: 2026-05-27. Le fonti primarie (manuale Web Service, Manuale Utente, endpoint live, FAQ) sono state lette/verificate direttamente.

## Legenda affidabilità fonti
- **[UFF✓]** = fonte ufficiale Polizia di Stato letta/verificata direttamente in questa analisi.
- **[UFF]** = fonte ufficiale (citata, non riletta integralmente).
- **[COMMUNITY]** = fonte non ufficiale (gestionali, blog, forum) — utile per la prassi reale, non per il dettaglio normativo.
- **[NON DOCUMENTATO]** = nessuna fonte ufficiale trovata; da verificare empiricamente.

---

## Verdetto (3 righe)
1. **Fattibile, sì.** Esiste un Web Service SOAP ufficiale, documentato e stabile dal 2022 (`service.asmx`) per invio programmatico delle schedine. **[UFF✓]**
2. **Complessità: MEDIA** sul piano tecnico puro (SOAP legacy, tracciato a larghezza fissa, token ~1h); **MEDIO-ALTA** per il multi-tenant, perché non esiste un modello "API partner": si devono custodire e gestire le credenziali (Utente+Password+WSKey) di **ogni** struttura.
3. **Rischio tecnico principale:** *non esiste alcuna operazione — né via API né, a quanto documentato, via portale — per annullare/correggere una schedina già acquisita.* Combinato con un `Send` non idempotente e i downtime del portale, è il vero punto critico (rischio doppioni non eliminabili + correzioni che escono dal software).

---

## 1. Interfaccia tecnica

**È un Web Service SOAP** (non REST, non upload manuale, non scraping). **[UFF✓]**
- Endpoint: `https://alloggiatiweb.poliziadistato.it/service/service.asmx` — WSDL: `…/service.asmx?wsdl`. Servizio ASP.NET `.asmx`, namespace SOAP `AlloggiatiService`. **[UFF✓ — letto endpoint live + manuale]**
- Base normativa dell'apertura del WS: art. 5 c. 1-bis D.L. 53/2019 (conv. L. 77/2019) + Decreto Min. Interno 16/09/2021. **[UFF✓ — manuale WS pag. 2]**
- Le schedine **non** sono XML strutturato: ogni schedina è **una stringa a larghezza fissa** (tracciato record) passata in una lista di string. **[UFF✓ — manuale WS pagg. 9-10, 19-20]**

**Operazioni esposte (lista completa, verificata sull'endpoint live e nel manuale):**

| Metodo | Funzione |
|---|---|
| `GenerateToken` | Ottiene il token temporaneo (input: Utente, Password, WsKey) |
| `Authentication_Test` | Verifica validità di Utente+token |
| `Test` | Controllo/validazione di un elenco di schedine **senza** invio |
| `Send` | Validazione + invio; **solo le righe corrette vengono acquisite** |
| `Ricevuta` | Download ricevuta PDF di una data (ultimi 30 gg, escluso oggi) |
| `Tabella` | Download tabelle di riferimento (CSV `;`) |
| `GestioneAppartamenti_Test` / `_Send` | Test/invio per un singolo `IdAppartamento` (solo utenze "Gestione Appartamenti") |
| `GestioneAppartamenti_FileUnico_Test` / `_Send` | Test/invio multi-appartamento in un'unica chiamata (solo "Gestione Appartamenti") |
| `GestioneAppartamenti_AggiungiAppartamento` | Aggiunge un appartamento gestito |
| `GestioneAppartamenti_DisabilitaAppartamento` | Disabilita/elimina un **appartamento** (NON una schedina) |

> **Nessuna operazione di annullamento/modifica/cancellazione di una schedina.** L'unica "Eliminazione" è quella di un *appartamento*. **[UFF✓ — manuale WS pagg. 1, 16 + lista operazioni endpoint live]**

Documentazione ufficiale:
- Manuale Web Service (WS_ALLOGGIATI Rev.01, 13/01/2022): https://questure.poliziadistato.it/statics/13/manualewebsercices_alloggiatiweb.pdf?lang=it **[UFF✓]**
- Pagina manuali/supporto: https://alloggiatiweb.poliziadistato.it/portalealloggiati/supmanuali.aspx **[UFF]**

---

## 2. Autenticazione & multi-tenant (punto architetturale chiave)

**Meccanismo (verificato):** credenziali del portale + WSKey → token temporaneo. **Niente più certificato digitale** (sistema dismesso nel 2022). **[UFF✓ — manuale WS pagg. 4, 7]**
1. La struttura accede al portale (utente, password, codici, puk) e **genera la WSKEY** dall'interfaccia (stringa univoca, revocabile/rigenerabile). **[UFF✓]**
2. `GenerateToken(Utente, Password, WsKey)` → `TokenInfo{ issued, expires, token }`. **[UFF✓]**
3. Tutte le altre chiamate usano `Utente` + `token` (non la WSKey, non la password). **[UFF✓]**

**Durata token:** "validità temporanea" — la durata **non è dichiarata a parole**; l'**esempio ufficiale** mostra esattamente **1 ora** (`issued 13:13:47` → `expires 14:13:47`). Da leggere a runtime dal campo `expires`, non assumere un numero fisso. **[UFF✓ — manuale WS pag. 7]**

**Multi-tenant — conclusione: NON esiste un modello "API partner"/delega tecnica centralizzata.**
- **Caso base: 1 account = 1 struttura.** Ogni struttura ha proprie credenziali e propria WSKey. **[UFF✓]** La FAQ ufficiale conferma: *"Se ho più strutture, devo richiedere più autorizzazioni? Sì, ogni struttura deve avere una propria autorizzazione e delle credenziali specifiche."* **[UFF✓ — FAQ statics/48, Q16]**
- **Account "Gestione Appartamenti": multi-immobile dentro lo stesso account, ma solo nella stessa provincia/Questura.** I metodi `GestioneAppartamenti_*` + tracciato "file unico" permettono di gestire più appartamenti e inviarli in un'unica chiamata; ma `AggiungiAppartamento` accetta solo Comuni *"nella provincia di competenza dell'utente"*, e il Manuale Utente ribadisce: *"il campo comune può contenere solo luoghi ricadenti nella provincia della Questura di appartenenza."* **[UFF✓ — manuale WS pag. 15 + Manuale Utente]**
- **Property manager / piattaforma su molte strutture in province diverse: nessun costrutto tecnico dedicato.** **[NON DOCUMENTATO — non trovato]** La prassi reale dei gestionali è memorizzare, per ciascuna struttura, `Utente + Password + WsKey` e iterare gli invii. La "delega" all'intermediario è **contrattuale/amministrativa**, non un meccanismo dell'API; il titolare resta responsabile. **[COMMUNITY — cloud-hotel, AvaiBook, ilcommercialistaonline]**

**Implicazione architetturale per il SaaS:** servirà un **vault di credenziali per-struttura** (Utente+Password+WSKey), generazione/refresh del token per ciascuna (~1h), e un processo di **re-onboarding al cambio password** della struttura (il token smette di funzionare; secondo fonti gestionali la WSKey va anche rigenerata, max **1 generazione/giorno** **[COMMUNITY — Chekin, AvaiBook]**). Si custodiscono di fatto le password del portale di P.S. di terzi → segreti ad altissimo rischio.

---

## 3. Formato dati (tracciato record)

Riga a larghezza fissa, **168 caratteri** dati + CR/LF (170 totali) — variante "file unico" **174** dati (176 totali) con `ID Appartamento` in coda. **[UFF✓ — manuale WS pagg. 19-20]**

| Campo | Pos. | Lung. | Obbligo / Vincolo |
|---|---|---|---|
| Tipo Alloggiato | 0–1 | 2 | Obbl. — Codice Tabella Tipi_Alloggiato |
| Data Arrivo | 2–11 | 10 | Obbl. — gg/mm/aaaa |
| Giorni Permanenza | 12–13 | 2 | Obbl. — max 30 |
| Cognome | 14–63 | 50 | Obbl. |
| Nome | 64–93 | 30 | Obbl. |
| Sesso | 94 | 1 | Obbl. — 1=M / 2=F |
| Data Nascita | 95–104 | 10 | Obbl. — gg/mm/aaaa |
| Comune Nascita | 105–113 | 9 | Obbl. **se Stato nascita = Italia** — Codice Tabella Comuni |
| Provincia Nascita | 114–115 | 2 | Obbl. **se Italia** — Sigla provincia |
| Stato Nascita | 116–124 | 9 | Obbl. — Codice Tabella Stati |
| Cittadinanza | 125–133 | 9 | Obbl. — Codice Tabella Stati |
| Tipo Documento | 134–138 | 5 | Obbl. per Ospite Singolo/Capo Famiglia/Capo Gruppo — **Blank** per Familiare/Membro Gruppo — Codice Tabella Documenti |
| Numero Documento | 139–158 | 20 | come sopra |
| Luogo Rilascio Documento | 159–167 | 9 | come sopra — Codice Tabella Stati o Comuni |
| ID Appartamento *(solo file unico)* | 168–173 | 6 | Obbl. — id appartamento attivo |

**Regola chiave sul documento (verificata):** il documento è obbligatorio per i tipi **16/17/18 = Ospite Singolo / Capo Famiglia / Capo Gruppo**; per i tipi **19/20 = Familiare / Membro Gruppo** i campi documento vanno lasciati **blank**. **[UFF✓ — manuale WS pagg. 19-20 (codici) + Manuale Utente (etichette Ospite Singolo/Capo Famiglia/Capo Gruppo)]**

**Stranieri:** nei campi "luogo di nascita" e "luogo di rilascio documento" si inserisce **lo Stato**, non il comune. **[UFF✓ — FAQ statics/48 Q8]**

**Tabelle di codifica ufficiali** scaricabili via metodo `Tabella` (CSV `;`): `0 Luoghi`, `1 Tipi_Documento`, `2 Tipi_Alloggiato`, `3 TipoErrore`, `4 ListaAppartamenti`. **[UFF✓ — manuale WS pagg. 6, 18]**

---

## 4. Gestione errori e correzioni

**Modello di errore (verificato):** ogni risposta è un `EsitoOperazioneServizio{ esito(bool), errorCod, errorDes, erroreDettaglio }`; per invii multipli, `ElencoSchedineEsito{ SchedineValide(int), Dettaglio[] }` dà l'esito **riga per riga**. Esempi reali di errore nel manuale: `11 SCHEDINA_FORMATO_NON_CORRETTO` ("Dimensione Riga errata"), `12 SCHEDINA_CAMPO_NON_CORRETTO` ("Data di Arrivo Errata"). **[UFF✓ — manuale WS pagg. 5-6, 9]**

**Errori PRE/IN invio = gestibili facilmente.** `Send` acquisisce *solo* le righe corrette e scarta quelle invalide con dettaglio errore; si ricorregge e si re-invia *solo* la riga scartata. Esiste `Test` per validare senza inviare. **[UFF✓ — manuale WS pag. 10; Manuale Utente: "trasmettere le schede corrette … successivamente correggere gli errori … ritrasmettendo solo queste ultime"]**

**Correzione/annullamento di una schedina GIÀ ACQUISITA = il vero limite.**
- **Via API: impossibile.** Nessun metodo di delete/modifica/annullamento (lista operazioni completa). **[UFF✓]**
- **Via portale: non documentato alcun annullamento post-invio.** Attenzione all'equivoco diffuso: il pulsante **"Annulla"** descritto nel Manuale Utente **azzera l'inserimento *prima* dell'invio** (scarta i dati digitati), **non** annulla una schedina trasmessa. Né il Manuale Utente né la FAQ live espongono una funzione di annullamento/modifica post-trasmissione; la FAQ live prevede solo la **verifica** in giornata via "ANALISI INVII". **[UFF✓ — Manuale Utente; FAQ.aspx]**
- **Conseguenza:** la correzione di dati già acquisiti **esce dal software** e passa dalla **Questura** (tipicamente via PEC). *Questo è un limite del SISTEMA Alloggiati, non dei prodotti dei competitor:* nessun software può offrire correzione programmatica perché la piattaforma non espone l'operazione. **[COMMUNITY per la prassi PEC→Questura; UFF✓ per l'assenza di funzioni di correzione]**
- ⚠️ Le affermazioni di alcuni blog ("si può annullare entro 24h dal portale") **non trovano riscontro** nei manuali ufficiali letti. Probabile confusione con: (a) il termine di legge di 24h per l'invio, o (b) la correzione delle righe scartate al momento dell'invio. **Da verificare empiricamente.**

---

## 5. Vincoli operativi

- **Termini di invio (verificato su fonte ufficiale):** entro **24 ore** dall'arrivo; per soggiorni **≤ 24 ore, entro 6 ore** dall'arrivo. Il portale accetta come Data Arrivo solo *oggi o ieri*. **[UFF✓ — Manuale Utente: "i dati debbano pervenire alla Questura entro le ventiquattro ore dall'arrivo; … soggiorni non superiori alle ventiquattro ore entro le sei ore"]** Base: art. 109 TULPS. **[UFF]**
- Si comunicano **solo gli arrivi**, non le partenze; partenze anticipate non vanno comunicate; prolungamenti = nuovo inserimento. **[UFF✓ — FAQ statics/48 Q7, Q13]**
- **Rate limit / numero max schedine per chiamata:** **[NON DOCUMENTATO]** — nessun limite indicato nel manuale WS.
- **Finestre di manutenzione / SLA / downtime:** **[NON DOCUMENTATO]** ufficialmente. La prassi prevede, in caso di malfunzionamento, **24h per contattare il Commissariato** e, se il portale è giù, invio via **PEC alla Questura** allegando il file .txt (con valore legale solo da PEC). **[UFF✓ — FAQ statics/48 Q5; COMMUNITY per il dettaglio PEC]** Downtime e lentezze del portale sono segnalati ricorrentemente dagli operatori. **[COMMUNITY]**
- **Sanzione** per omessa/tardiva comunicazione: arresto fino a 3 mesi o ammenda fino a 206€ (art. 17 TULPS). **[COMMUNITY/UFF]** → alza la criticità di affidabilità del sistema.

---

## 6. Come fanno i competitor

- **Modello comune (Chekin, Wiisy, Smoobu, AvaiBook, cloud-hotel, Octorate…):** l'host genera la **WSKey** nel portale Alloggiati e inserisce **WSKey + credenziali della propria struttura** nel gestionale; il gestionale invia via Web Service. È esattamente il modello "credenziali per-struttura" — nessuno ha un canale privilegiato. **[COMMUNITY — Wiisy guida; Chekin (blog WSKey); AvaiBook help; cloud-hotel]**
- **Correzioni:** Chekin descrive la rettifica "entro determinati limiti temporali" *dal portale* (annulla + reinvia), in modo vago; nessun competitor offre annullamento programmatico (non esiste l'operazione). **[COMMUNITY — Chekin blog]** → conferma che il "dolore PEC→Questura" è **limite di sistema**.
- Dettaglio tecnico pubblico dei competitor: scarso (le pagine sono marketing/help, non spec tecniche). **[COMMUNITY]**

---

## I 3 rischi tecnici maggiori + mitigazioni

**R1 — Nessuna correzione/annullamento + `Send` potenzialmente non idempotente ⇒ rischio doppioni NON eliminabili.**
Se un `Send` va in timeout e si ritenta, si rischia di acquisire due volte la stessa schedina, *senza poterla cancellare*. È il rischio più insidioso.
→ *Mitigazione:* validazione fortissima **pre-invio** (`Test` + validazione contro le tabelle ufficiali + conferma umana sui dati sensibili); invio **idempotente lato nostro** (chiave di dedup per schedina, stato "inviata" persistito prima del retry, riconciliazione con `Ricevuta`); retry solo dopo verifica dello stato; workflow guidato verso la Questura per le correzioni post-acquisizione, con audit trail e ricevute archiviate (5 anni).

**R2 — Multi-tenant a credenziali per-struttura (centinaia di segreti P.S. di terzi).**
Custodia di Utente+Password+WSKey per ogni host; i token scadono (~1h); il cambio password lato host rompe tutto; WSKey rigenerabile max 1/giorno.
→ *Mitigazione:* vault cifrato (KMS/HSM), cifratura per-tenant, minimo privilegio e audit accessi; cache/refresh del token per-struttura leggendo `expires`; **health-check periodico** con `Authentication_Test` e alert proattivo "credenziali non valide → re-onboarding"; onboarding che cattura e **valida subito** le credenziali; valutare le utenze **"Gestione Appartamenti"** per consolidare più immobili di uno stesso ambito provinciale (riduce la proliferazione).

**R3 — Fragilità del portale legacy (SOAP `.asmx`, downtime, nessun SLA/rate limit documentato) sotto vincolo 24h/6h.**
→ *Mitigazione:* coda di invio asincrona con backoff e **circuit breaker**; scheduling che rispetta la finestra 6h/24h con allarmi di "scadenza imminente"; monitoraggio uptime e tasso di errore per codice; **fallback PEC documentato** verso la Questura competente; client SOAP tollerante (timeout, retry idempotenti, logging dei `Fault`).

---

## Cosa resta da verificare empiricamente (non sapibile senza provare)

1. **Idempotenza di `Send`**: cosa succede inviando due volte la stessa schedina? Genera un doppione (presumibilmente non eliminabile)? — *test prioritario.*
2. **Durata reale e comportamento del token** a scadenza (confermare ~1h; errore restituito).
3. **Rate limit / timeout / dimensione massima** dell'elenco schedine per chiamata (non documentati).
4. **Finestre di manutenzione e pattern di downtime** reali del portale.
5. **Annullamento post-invio**: esiste davvero una finestra UI same-day/24h (come dicono i blog) o no (come suggeriscono i manuali)? E la **procedura reale di correzione con la Questura** (PEC? modulo? tempi?), che varia per Questura.
6. **Modello "Gestione Appartamenti"**: un property manager può registrare sotto un'unica utenza appartamenti di **proprietari diversi**? Solo stessa provincia? Come si ottiene la categoria (autorizzazione Questura)? — *leva chiave per la scalabilità del multi-tenant.*
7. **Onboarding WSKey**: generazione davvero 1/giorno? si invalida al cambio password? — confermare il flusso reale.
8. **Tabelle ufficiali** (Comuni/Stati/Documenti/Tipi Alloggiato): dimensioni, frequenza di aggiornamento, versioning.
9. **Ambiente di test/sandbox**: esiste un collaudo separato o si valida in produzione col solo metodo `Test`? (apparentemente nessuna sandbox dedicata.)

---

## Fonti principali
**Ufficiali (Polizia di Stato) — verificate direttamente:**
- Manuale Web Service WS_ALLOGGIATI Rev.01: https://questure.poliziadistato.it/statics/13/manualewebsercices_alloggiatiweb.pdf?lang=it
- Manuale Utente (GUIDA, 25 pp.): https://questure.poliziadistato.it/statics/13/manualeutente_alloggiatiweb.pdf?lang=it
- Endpoint/operazioni live: https://alloggiatiweb.poliziadistato.it/service/service.asmx — WSDL `?wsdl`
- FAQ live: https://alloggiatiweb.poliziadistato.it/portalealloggiati/FAQ.aspx
- FAQ PDF (Roma): https://questure.poliziadistato.it/statics/48/faq-alloggiati-web.pdf?lang=it
- Pagina manuali/supporto: https://alloggiatiweb.poliziadistato.it/portalealloggiati/supmanuali.aspx

**Community / gestionali (prassi reale, non normativa):** Chekin (blog WSKey, invio schedine, errori), Wiisy (guida portale), Smoobu (guida Alloggiati), AvaiBook (Web Key), cloud-hotel, ilcommercialistaonline.
