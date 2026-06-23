# Pacchetto legale — "Garanzia Serenità" + deleghe per-pilastro

> ⚠️ **BOZZA NON VETATA — DA FAR REVISIONARE/REDIGERE A UN LEGALE ITALIANO** prima di qualsiasi
> promessa pubblica o invio reale (safeguard #8 della dottrina di automazione, CLAUDE.md).
> Questo NON è un parere legale: è un brief per accelerare il lavoro dell'avvocato.
> Redatto 2026-06-23 sulla base di ricerca su fonti pubbliche (vedi note).

---

## 0. Cosa chiediamo al legale (in 1 minuto)

1. **Validare/blindare** il testo della **garanzia commerciale "Serenità"** (§3): confermare che NON
   configuri esercizio abusivo di attività assicurativa (art. 12 Cod. Ass.) e resti garanzia
   contrattuale lecita.
2. **Redigere** le **3 deleghe/mandati per-pilastro** (§4): Alloggiati, tassa di soggiorno, ISTAT.
3. **Fissare i confini** del claim pubblico: cosa Norma può / non può promettere (es. "paghiamo la
   multa" vs "copriamo il danno da nostro errore").
4. **GDPR**: confermare lo schema responsabile del trattamento (art. 28) + DPA nel mandato.

---

## 1. Cosa fa Norma (contesto per il legale)

Norma è un SaaS che, per conto di host e property manager di affitti brevi, **prepara e trasmette in
automatico** i tre adempimenti obbligatori: (a) schedine di P.S. ad **Alloggiati Web** (art. 109
TULPS); (b) **dichiarazione della tassa di soggiorno**; (c) **movimento turistico ISTAT/Ross1000**.
Posizionamento: _"compliance garantita in automatico"_ — invio senza intervento per-evento, su un
**mandato firmato una volta**, con una **garanzia commerciale** sul danno da errore tecnico di Norma.

---

## 2. I paletti legali per pilastro (grounded — da confermare)

### A. Alloggiati Web (art. 109 TULPS)

- L'invio automatizzato **per conto terzi** via Web Service ufficiale **WS_ALLOGGIATI** (accesso
  WS-Key) è **già prassi lecita e diffusa** (gestionali/PMS lo fanno da anni).
  _Fonte: Manuale Web Services Alloggiati Web, Polizia di Stato._
- La **responsabilità è PENALE** (art. 17 TULPS) e **resta SEMPRE in capo al gestore/host**, anche
  quando l'invio è delegato: **la delega sposta l'esecuzione, non la responsabilità**. È
  **incedibile**. _→ Norma NON può "prendersi il reato"._
- Sanzione: penale (arresto fino a 3 mesi o **ammenda fissa** fino a un massimo), **non
  proporzionale** al n° ospiti. In quanto penale è **non assicurabile** (art. 12 Cod. Ass.).

### B. Tassa di soggiorno

- **Cass. SSUU ord. 1527/2026**: il gestore è **"responsabile d'imposta"** (non più "agente
  contabile"); **abolito il Modello 21**; resta la **dichiarazione telematica annuale** all'Agenzia
  delle Entrate.
- **Dal 2026 gli intermediari** (property manager, piattaforme, portali) che gestiscono incassi per
  conto dei proprietari sono **espressamente legittimati/obbligati a presentare la dichiarazione**,
  diventando essi stessi responsabili d'imposta: **la firma della sezione "intermediario" vale
  assunzione di responsabilità**. → **È il pilastro dove Norma può legittimamente diventare il
  soggetto dichiarante per conto.**
- Sanzione: **100–200% dell'imposta** (proporzionale, scala col fatturato) **+** una sanzione fissa
  per violazioni formali. **Il ravvedimento operoso abbatte**: 25% se l'imposta è versata, fino a
  **1/10 entro 90 giorni** → l'errore corretto in fretta costa pochissimo (chiave per la garanzia).
- ⚠️ **Alcuni Comuni (Roma, Milano, Bologna)** mantengono **comunicazioni periodiche locali** con
  accertamenti: la riforma 2026 **non chiude** automaticamente gli obblighi comunali → vanno
  **esclusi dalla garanzia** finché non mappati/coperti.

### C. ISTAT / movimento turistico (Ross1000 + portali regionali)

- Ross1000 prevede **nativamente** sia l'**import file** (.txt/.xml) da gestionale abilitato, sia una
  **funzione formale di "creazione delega"** a un soggetto terzo. Obbligo **statistico** (non
  penale/tributario): rischio più basso. Frammentazione regionale (credenziali/scadenze per regione).

---

## 3. Bozza di wording — "Garanzia Serenità" (modello Avalara/TurboTax)

> Principio: copre la **conseguenza del NOSTRO errore tecnico** (la sanzione), **non** l'imposta/il
> dovuto sottostante (che resta del cliente); **con cap**; **con esclusioni**; **è garanzia
> commerciale, NON una polizza**. Modelli di riferimento: Avalara (accuracy guarantee, "tax+penalty
> +interest OR 12 mesi di fee, whichever is lower"), TurboTax ("paghiamo penalty+interessi da NOSTRO
> errore di calcolo; il cliente resta responsabile del dovuto").

**Testo (bozza da redigere col legale):**

> «**Garanzia Serenità.** Se, a causa di un **errore tecnico esclusivamente imputabile a Norma**
> nell'esecuzione automatica di un adempimento per il quale ci hai conferito mandato (generazione o
> trasmissione di una schedina, di una dichiarazione o di una comunicazione), ti viene irrogata una
> **sanzione**, Norma **ti rimborsa l'importo della sanzione e degli interessi** che ne conseguono,
> **fino a un massimale pari al minore tra (a)** il danno effettivamente subìto **e (b)** i
> corrispettivi da te pagati a Norma nei **12 mesi precedenti** all'evento.
>
> **Esclusioni** (la garanzia non opera se): i dati che ci hai fornito erano **incompleti, errati o
> non veritieri**; la configurazione del tuo account era errata; non hai risposto a una **richiesta
> di Norma** entro i tempi indicati; l'evento dipende da **cause esterne** (indisponibilità del
> sistema dell'ente, forza maggiore); l'adempimento **non era stato delegato** a Norma; si tratta di
> **obblighi comunali locali** non ancora coperti dal servizio.
>
> **Natura.** È una **garanzia commerciale contrattuale**: Norma risponde del **proprio
> inadempimento tecnico** e **non** ti solleva dalla responsabilità verso l'ente, che resta tua per
> legge (in particolare la responsabilità penale ex artt. 109/17 TULPS, **incedibile**).»

**Per il legale:** ① confermare che questa formulazione resta _garanzia commerciale_ e non
attività assicurativa (art. 12 Cod. Ass.); ② affiancare una **RC professionale / E&O** (mercato
Lloyd's, claims-made, massimale ~250k) a copertura della responsabilità di Norma verso il cliente,
**distinta** dal "pagare la multa"; ③ definire il **fondo/accantonamento** interno (dimensionabile
basso grazie al ravvedimento) prima di pubblicizzare la garanzia.

---

## 4. Le 3 deleghe / mandati (bozze da redigere)

### A. Mandato Alloggiati — "esecutore tecnico"

> «Il Gestore conferisce a Norma **mandato a trasmettere per suo conto**, **sotto le credenziali
> Alloggiati Web del Gestore** (WS-Key), le schedine di pubblica sicurezza ex art. 109 TULPS. **La
> titolarità e la responsabilità della comunicazione, anche penale ex art. 17 TULPS, restano in capo
> al Gestore**; Norma esegue la sola trasmissione tecnica e ne conserva evidenza (audit + ricevuta).
> Mandato **revocabile** in ogni momento.»
> _Per il legale:_ formula che eviti che Norma sia qualificata "gestore di fatto".

### B. Mandato Tassa — "intermediario dichiarante"

> «Il Titolare conferisce a Norma **incarico di intermediario** per la **presentazione della
> dichiarazione telematica** dell'imposta di soggiorno all'Agenzia delle Entrate per conto del
> Titolare (quadro 2026, Cass. SSUU 1527/2026), con **sottoscrizione della sezione intermediario**.»
> _Per il legale:_ chiarire **quali obblighi/rischi** Norma assume firmando (responsabile d'imposta
> della **dichiarazione**); **Norma NON effettua il versamento** dell'imposta (resta sul flusso
> esistente) per non diventare istituto di pagamento.

### C. Delega ISTAT / Ross1000

> «Il Titolare delega Norma alla **trasmissione dei dati di movimento turistico** tramite il sistema
> regionale (Ross1000 o portale regionale), usando la **funzione di delega nativa** ove disponibile
> o l'**import file** abilitato.»

### D. GDPR (trasversale, in ogni mandato)

> Norma agisce come **responsabile del trattamento** (art. 28 GDPR) dei dati ospite: includere un
> **DPA** (finalità, misure di sicurezza — i dati passano dal `SecretsVault`, mai in chiaro,
> retention, sub-responsabili).

---

## 5. Le domande secche per il legale (i redline che servono)

1. Il wording §3 resta **garanzia commerciale** e non assicurativa? Come blindarlo?
2. Mandato Alloggiati: formula corretta per "esecutore tecnico sotto credenziali del gestore" **senza
   che Norma diventi gestore di fatto** né assuma la responsabilità penale?
3. Tassa: firmando la sezione intermediario, **quali rischi precisi** assume Norma come responsabile
   d'imposta della dichiarazione? Conviene assumerli o restare "preparatore" che fa firmare l'host?
4. **Versamento**: confermare che Norma può **dichiarare senza versare** restando fuori dal perimetro
   "istituto di pagamento" (autorizzazione Banca d'Italia).
5. **Comuni locali** (Roma/Milano/Bologna): come **escluderli chiaramente** dalla garanzia e dalla
   promessa di copertura finché non mappati?
6. **GDPR**: DPA minimo da allegare al mandato.

---

### Note

Fonti pubbliche usate per il brief (da verificare dal legale): Manuale WS Alloggiati Web (Polizia di
Stato); art. 109/17 TULPS (Brocardi/Diritto.it); Cass. SSUU ord. 1527/2026 (IFEL/commenti);
dichiarazione imposta soggiorno 2026 (commenti di settore); Ross1000 + manuale deleghe Regione
Emilia-Romagna; art. 12 Cod. Ass. (ANIA/Assinews); accuracy guarantee Avalara; guarantees TurboTax;
ravvedimento operoso (FiscoeTasse). **Nessuna di queste fonti sostituisce il parere del legale.**
