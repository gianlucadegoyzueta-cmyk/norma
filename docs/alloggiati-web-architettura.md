# Alloggiati Web — Decisioni architetturali (5 punti chiave)

> Companion di [alloggiati-web-analisi-fattibilita.md]. Niente codice di produzione: pattern di progettazione.
> Convenzione: **[VERIFICATO]** = da fonte ufficiale Polizia di Stato letta direttamente. **[SUPPOSIZIONE]** = mio giudizio ingegneristico / best practice, non un fatto Alloggiati. **[COMMUNITY]** = prassi non ufficiale. **[NON DOC]** = nessuna fonte ufficiale.

## Filo conduttore

Tre vincoli verificati determinano _tutto_ il resto:

1. **Nessuna cancellazione/correzione** di una schedina acquisita (né API né portale). [VERIFICATO]
2. **`Send` senza idempotenza**: nessun ID univoco lato chiamante, nessun dedup documentato. [VERIFICATO assenza]
3. **Riconciliazione differita**: `Ricevuta` = PDF, solo giorni passati (no giorno corrente); riscontro same-day solo via UI "Analisi Invii". [VERIFICATO]

⇒ Il sistema va progettato per **non emettere mai una schedina sbagliata o doppia**, perché è irreversibile. Si sposta tutto il peso su _validazione pre-invio_ e _retry prudente_.

---

## 1. Idempotenza del `Send` (priorità massima)

**[VERIFICATO]**

- `Send(Utente, token, ElencoSchedine: string[])` → `ElencoSchedineEsito{ SchedineValide, Dettaglio[] }`, esito **riga per riga nello stesso ordine dell'input**. Solo le righe corrette sono acquisite. (manuale WS pag. 10)
- **Nessun parametro ID/idempotency-key** nella firma. Nessun meccanismo di dedup documentato (0 occorrenze in manuale WS + Manuale Utente).
- FAQ Q7: per cambi (es. prolungamento) si **re-invia una nuova schedina** → invii multipli sullo stesso ospite sono il meccanismo atteso.

**[SUPPOSIZIONE forte]** Il server **non deduplica**: due `Send` identici creano due schedine (entrambe non eliminabili). Il punto pericoloso non è il retry "normale" (se ottieni la risposta, sai riga-per-riga cosa è stato acquisito), ma il **timeout senza risposta**: non sai se il server ha acquisito.

### Pattern consigliato — Outbox + dedup-key + riconciliazione differita [SUPPOSIZIONE/best practice]

1. **Chiave di deduplica deterministica** per schedina (es. hash di `struttura|idAppartamento|dataArrivo|tipoDoc|numDoc|cognome|nome|dataNascita`). Vincolo UNIQUE in DB ⇒ impossibile creare due intenti identici.
2. **Outbox**: persisti l'intento con stato `PENDING` _prima_ di qualsiasi rete. Transizione `PENDING → SENDING` **persistita prima** della chiamata (un crash a metà lascia traccia in `SENDING`, non perdi nulla).
3. **Single-flight per credenziale/struttura**: una sola `Send` in volo per struttura (lock/lease). Evita race e l'incognita "un nuovo token invalida i precedenti?".
4. **Alla risposta**: mappa ogni riga `Dettaglio[i]` all'intento `i` → `ACQUIRED` (con riferimento alla ricevuta del giorno) o `REJECTED` (con `errorCod`/`errorDes`, ri-correggibile). Persisti **in transazione**.
5. **Al timeout/incognita** (il caso critico): stato `UNVERIFIED`. **NON ritentare alla cieca.** Riconcilia prima:
   - Same-day **non** c'è metodo WS per elencare le schedine acquisite oggi (`Ricevuta` esclude oggi; "Analisi Invii" è solo UI). [VERIFICATO]
   - Strategie: (a) attendere `Ricevuta` di T+1 e confermare/riparare; (b) verifica umana via portale; (c) progettare gli invii **con largo anticipo** sulla deadline così da poter attendere il riscontro e, solo se confermato non-acquisito, re-inviare.
   - Regola d'oro: in incertezza, **preferire la conferma tardiva al rischio doppione** (il doppione è irreversibile; un invio confermato ma tardivo entro finestra è accettabile). La tensione con la sanzione per omissione si risolve **non inviando all'ultimo minuto**.
6. **Job di riconciliazione T+1**: scarica `Ricevuta(data=ieri)`, estrai i nominativi, concilia gli `UNVERIFIED`/`ACQUIRED`. (La `Ricevuta` è PDF → parsing fragile [SUPPOSIZIONE]; contenuto/struttura non documentati in dettaglio.)
7. La **risposta di `Send` è di per sé il segnale di idempotenza**: gestendola in modo transazionale elimini il 99% del rischio; resta solo la finestra "timeout puro", gestita da riconciliazione, non da retry cieco.

### Da verificare empiricamente

- **Il server deduplica gli invii identici?** ⚠️ Catch-22: per testarlo creeresti doppioni reali non eliminabili → testare solo con `Test` (che non invia) o su struttura "sacrificabile", o chiedere a CEN/Questura.
- Comportamento esatto su timeout: SOAP `Fault`? HTTP status? c'è un transaction-id nella ricevuta per correlare?
- Formato/contenuto reale della `Ricevuta` (PDF) per automatizzare la riconciliazione.
- Conferma che non esista un metodo WS "lista invii odierni".

---

## 2. Gestione token multi-tenant (~1h, centinaia di host)

**[VERIFICATO]** `GenerateToken(Utente, Password, WsKey) → {issued, expires, token}`; `expires` da leggere (esempio = 1h). `Authentication_Test(Utente, token)` valida un token. (manuale WS pagg. 7-8)

**[NON DOC]** Durata numerica garantita; se un nuovo `GenerateToken` invalida i token precedenti; token concorrenti ammessi; rate limit su `GenerateToken`.

### Pattern consigliato [SUPPOSIZIONE/best practice]

- **Token cache per credenziale** `{token, expires}`; refresh **lazy** quando `now > expires - margine` (es. 5 min).
- **Refresh on-demand, non di massa**: con centinaia di host, la maggior parte è idle in ogni istante; generi il token **solo quando hai schedine da inviare** per quella struttura ⇒ nessun "refresh storm". Niente cron che rigenera tutto insieme.
- **Single-flight per struttura** sulla generazione token (evita N token concorrenti e neutralizza l'incognita "il nuovo invalida il vecchio").
- **Rilevazione rottura & re-onboarding**:
  - Distingui errori di **autenticazione** (password cambiata / WSKey revocata → credenziale `INVALID`) da errori **transitori** (portale giù) via `errorCod` (Tabella `TipoErrore` scaricabile [VERIFICATO esiste]).
  - **Health-check proattivo periodico** (es. giornaliero) con `Authentication_Test` → rileva la rottura **fuori banda**, prima che arrivi un ospite con la deadline. Stato credenziale: `OK | EXPIRING | INVALID`.
  - Su `INVALID`: workflow di **re-onboarding** (notifica all'host: re-inserire password / rigenerare WSKey), con blocco invii e alert.
- **Cambio password host**: rompe `GenerateToken` (richiede password corrente). [VERIFICATO la password serve] Secondo i gestionali va anche **rigenerata la WSKey** (max 1/giorno) [COMMUNITY]. ⇒ il re-onboarding deve raccogliere _entrambi_.

### Da verificare empiricamente

- Durata reale token + se `GenerateToken` ripetuto invalida i precedenti / quanti token concorrenti.
- Rate limit/΄throttling su `GenerateToken` (un re-onboarding di massa potrebbe inciampare?).
- Mappa esatta `errorCod` per: password errata vs WSKey revocata vs utenza bloccata (scaricare `TipoErrore`).
- Se davvero la WSKey si invalida al cambio password.

---

## 3. Vault credenziali (Utente + Password + WSKey di terzi)

**[VERIFICATO, vincolo forte]** Per automatizzare 24/7 **devi conservare la password** del portale: il token dura ~1h e `GenerateToken` richiede `Utente+Password+WsKey`. Non c'è modo di evitarlo senza re-input manuale dell'host (che ucciderebbe l'automazione). ⇒ stai custodendo **credenziali di accesso a un sistema della Polizia di Stato** + tratti **dati personali/documenti** degli ospiti.

### Pattern consigliato [SUPPOSIZIONE/best practice di sicurezza]

- **Secrets manager dedicato** (Vault / AWS Secrets Manager / GCP Secret Manager), **non** colonne nel DB applicativo.
- **Envelope encryption**: DEK **per-tenant** avvolta da master key in **KMS con backing HSM**; rotazione chiavi. Un compromesso di una chiave **non** espone tutti i tenant (limita il blast radius).
- **Password = tier massimo**: chiave KMS separata, accessi più ristretti, eventuale conferma/seal aggiuntiva.
- Cifratura at-rest **e** in-transit; **mai** loggare segreti (redaction); niente segreti in errori/trace.
- Accesso solo via **ruoli IAM a privilegio minimo e effimeri**; **audit log** completo di ogni accesso ai segreti; alert su accessi anomali.
- **Onboarding**: valida subito le credenziali (`GenerateToken`+`Authentication_Test`) e memorizza solo se valide; non persistere mai in chiaro nei log di onboarding.
- **Realismo**: la cifratura non elimina il rischio (l'app _deve_ poter decifrare per usarle). Il baricentro della difesa è **access control + audit + isolamento per-tenant + minimizzazione**, non solo "è cifrato".

### Aspetti legali (segnalo, non sono un parere legale) [SUPPOSIZIONE]

- Rispetto agli ospiti: sei **responsabile del trattamento** (il titolare è l'host) → serve **DPA**; valuta residenza dati UE.
- Le Questure tendono a spingere perché **ogni proprietario abbia credenziali proprie**, perché delegare la comunicazione è **responsabilità penale** [COMMUNITY] → da chiarire con consulenza legale come inquadrare la custodia delle credenziali da parte di un intermediario SaaS.

### Da verificare empiricamente / legalmente

- Esiste una regola/divieto ufficiale (TOS del portale, CEN) sul fatto che terzi conservino le credenziali?
- Inquadramento legale dell'intermediario che invia per conto dell'host (delega scritta, responsabilità).

---

## 4. Gestione Appartamenti (leva di scalabilità multi-tenant)

**[VERIFICATO]** (manuale WS pag. 15 + Manuale Utente pag. 19)

- È per _"gestori o proprietari di appartamenti"_ → **un property manager/agenzia può usarla**, non solo il proprietario.
- Un'unica utenza gestisce **più appartamenti** (`IdAppartamento`); invio batch multi-appartamento con `GestioneAppartamenti_FileUnico_Send`; lista via `Tabella(ListaAppartamenti)`.
- **Vincolo provincia**: `AggiungiAppartamento` accetta solo Comuni _"nella provincia di competenza dell'utente"_ / _"luoghi ricadenti nella provincia della Questura di appartenenza"_. ⇒ **una utenza = una provincia**.
- Il record appartamento ha campi `Descrizione, ComuneCodice, Indirizzo, **Proprietario**` ⇒ il sistema contempla **proprietari diversi** per appartamenti gestiti dalla stessa utenza.

**[COMMUNITY]**

- Conferma: _"non serve attivare tanti profili quanti gli appartamenti, purché tutti nella stessa Questura"_.
- L'attivazione è una **spunta "gestione appartamenti"** sul modulo di richiesta credenziali.
- Per agenzie/gestori, aggiungere una struttura di **altro proprietario** richiede una **procedura manuale** alla Questura: mail oggetto _"INSERIMENTO ALTRA STRUTTURA"_ + PDF di SCIA/DIA + documento del proprietario.
- Tensione legale: alcune Questure spingono per credenziali per-proprietario (responsabilità penale della delega). Le regole **variano per Questura**.

### Pattern consigliato [SUPPOSIZIONE/design]

- **Modello dati che NON assume "1 credenziale = 1 immobile"**:
  `Account(cliente SaaS) → 1..n Credenziale{utente,password,wskey, categoria: SINGOLA | GESTIONE_APPARTAMENTI, provincia/Questura}`; per `GESTIONE_APPARTAMENTI`: `1..n Appartamento{idAppartamento, comune, indirizzo, proprietario}`.
- **Mappa la realtà del cliente**:
  - Cliente = singola struttura → 1 credenziale `SINGOLA`.
  - Cliente = PM in 1 provincia → 1 credenziale `GESTIONE_APPARTAMENTI` con N appartamenti (anche di proprietari diversi).
  - Cliente = PM in K province → **K credenziali** `GESTIONE_APPARTAMENTI` (una per provincia). Questo è il **limite di consolidamento**: si riduce la proliferazione _dentro_ la provincia, non tra province.
- **Sync appartamenti** con `Tabella(ListaAppartamenti)`; usa `FileUnico_Send` per efficienza di invio.
- **Provisioning non del tutto automatizzabile**: `AggiungiAppartamento` è programmatico [VERIFICATO], ma l'autorizzazione Questura ("INSERIMENTO ALTRA STRUTTURA") è un **gate manuale** [COMMUNITY] ⇒ modella un onboarding struttura con stato "in attesa autorizzazione Questura".
- **Supporta entrambi i modelli** (per-host e gestione-appartamenti); non incardinare il prodotto su uno solo.

### Da verificare empiricamente (con una o più Questure reali)

- Una stessa utenza Gestione Appartamenti può davvero contenere immobili di **proprietari legalmente diversi**? (varia per Questura)
- La spunta "gestione appartamenti" è attivabile anche **dopo**? Come?
- PM su più province ⇒ confermare "una utenza per provincia".
- `AggiungiAppartamento` funziona **prima** o **solo dopo** l'autorizzazione via mail?

---

## 5. Fallback portale giù (dentro la finestra 24h/6h)

**[VERIFICATO]** FAQ Q5: in caso di problemi tecnici hai **24h per contattare il Commissariato di zona** e concordare le modalità di invio. Termini: 24h (≤24h di soggiorno → 6h). "Invio File" del portale accetta un **.txt** col tracciato (stessa codifica dei record). (Manuale Utente pag. 13)

**[COMMUNITY]** A portale irraggiungibile: **PEC dal tuo indirizzo certificato** alla **Questura territorialmente competente**, allegando il **file TXT** (tracciato), indicando nome struttura, proprietario e username AlloggiatiWeb. Il **valore legale** richiede l'invio da PEC. File: **UTF-8**, testo semplice (no Word/Excel/PDF), attenzione alle interruzioni di riga.

### Pattern consigliato [SUPPOSIZIONE/design]

- **Coda durevole per struttura** con stati; **retry backoff esponenziale + jitter** sugli errori transitori; **circuit breaker globale sul portale** per non martellarlo quando è giù.
- **Scheduling deadline-aware**: ogni schedina ha una deadline (arrivo +24h, o +6h se soggiorno breve). Invia **con margine**; escalation man mano che la deadline si avvicina.
- **Scala di fallback**:
  1. Retry `Send` con backoff finché c'è margine.
  2. Vicino alla deadline e ancora KO: **genera il TXT** (stesso tracciato) e attiva il **fallback PEC** verso la PEC della Questura competente, con i dati richiesti.
  3. Conserva log del disservizio (timestamp, errori) + **ricevuta PEC** come prova dell'adempimento tempestivo.
- **Il passo PEC è solo semi-automatizzabile**: (a) per valore legale dovrebbe partire dalla **PEC dell'host** [COMMUNITY]; (b) ogni Questura ha la **sua PEC**; (c) è un percorso eccezionale. ⇒ progettalo come **"fallback assistito"**: il SaaS genera TXT + precompila la PEC + instrada alla Questura giusta, l'host (o una PEC delegata) invia. Automazione piena solo con mandato + integrazione PEC dell'host.
- **Registro PEC delle Questure per provincia** da costruire e mantenere (dato operativo).

### Da verificare empiricamente

- La PEC ha valore legale se inviata **dall'intermediario** invece che dall'host? (varia per Questura)
- Formato/codifica reale del TXT per la PEC (UTF-8? header? stesso tracciato del WS?). [COMMUNITY dice UTF-8 → confermare]
- PEC vs contatto al Commissariato: vanno fatti entrambi? in che ordine?
- Indirizzi PEC per ciascuna Questura (costruire il registro).
- Pattern reali di downtime/manutenzione (non documentati).
