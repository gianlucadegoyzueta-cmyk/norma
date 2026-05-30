// =====================================================================================
// MOCK SERVER FEDELE dell'endpoint Alloggiati Web (SOAP, Polizia di Stato).
//
// Scopo: collaudare l'INTERO flusso di invio schedine (GenerateToken → Authentication_Test →
// Test → Send) senza MAI toccare il sistema reale. NON è codice di produzione: vive sotto
// __tests__/ e non è esportato dall'index del modulo.
//
// Come si aggancia: il client reale `AlloggiatiSoapClient` accetta un `fetchImpl` iniettabile.
// Questo mock ESPONE proprio una `fetch` che parla SOAP 1.1, così tutto lo stack reale
// (envelopes → fast-xml-parser → classificazione errori → SoapAlloggiatiSender → outbox)
// gira invariato contro il mock. È il punto di mock già previsto dal codice di produzione.
//
// FEDELTÀ — cosa replica fedelmente, sulla base del codice/manuale REALI (non assunzioni):
//  - Firme e nomi dei metodi SOAP: GenerateToken, Authentication_Test, Test, Send, Tabella
//    (namespace "AlloggiatiService", SOAPAction "AlloggiatiService/<Metodo>").
//  - Forma di richiesta (Utente/Password/WsKey, token, ElencoSchedine/string[]) e di risposta
//    (`<Metodo>Response > <Metodo>Result` + `result{ SchedineValide, Dettaglio{EsitoOperazioneServizio[]} }`),
//    con la doppia capitalizzazione del manuale (`esito` minuscolo, `ErroreCod/ErroreDes/ErroreDettaglio`).
//  - Esiti riga-per-riga di Test/Send: stessa struttura (Test e Send condividono il tracciato).
//  - I DUE soli codici di errore UFFICIALMENTE attestati nel manuale WS, DERIVATI dal record
//    reale (non inventati): `11` formato (lunghezza riga errata) e `12` campo (data di arrivo
//    fuori finestra oggi/ieri).
//
// LIMITI ONESTI (vedi anche README accanto a questo file):
//  - Il catalogo completo `TipoErrore` NON è nel repo → i rifiuti diversi da 11/12 si passano
//    esplicitamente dal test come codici [MOCK] non ufficiali (campo `rejectRow`).
//  - Il comportamento del server reale sul DOPPIO INVIO è ufficialmente IGNOTO (testarlo creerebbe
//    doppioni irreversibili). Il mock tiene un registro `acquired` solo per ASSERIRE quante volte
//    una riga è arrivata davvero al server: i test verificano la protezione LATO NOSTRO (la
//    macchina a stati non ri-invia mai alla cieca), non un comportamento del server che nessuno conosce.
// =====================================================================================

import { XMLParser } from "fast-xml-parser";
import { toArray } from "../../soap/parse";
import { TRACCIATO_FILE_UNICO_LEN, TRACCIATO_LEN } from "../../domain/tracciato";

/** Credenziale considerata valida dal mock (utente+password+wskey). */
export interface MockCredential {
  utente: string;
  password: string;
  wskey: string;
}

/** Esito di rifiuto di una singola riga (codice + descrizione + eventuale dettaglio). */
export interface RowRejection {
  errorCod: string;
  errorDes: string;
  errorDettaglio?: string;
}

/**
 * Codici di errore Alloggiati. SOLO quelli realmente attestati nel codebase/manuale.
 *  - 11 / 12  → UFFICIALI (manuale WS pagg. 5-6, 9): derivati dal record reale dal mock.
 *  - 1        → compare SOLO in una fixture di test su GenerateToken (NON confermato dal manuale).
 * Qualsiasi altro codice è [MOCK] e va passato esplicitamente dal test (rejectRow), mai inventato qui.
 */
export const ALLOGGIATI_ERROR = {
  /** [fixture-only, non manuale] credenziali/token non validi su GenerateToken. */
  CREDENZIALI_NON_VALIDE: { errorCod: "1", errorDes: "Credenziali non valide" } as RowRejection,
  /** [UFF✓] lunghezza/forma riga errata. */
  SCHEDINA_FORMATO_NON_CORRETTO: {
    errorCod: "11",
    errorDes: "SCHEDINA_FORMATO_NON_CORRETTO",
    errorDettaglio: "Dimensione Riga errata",
  } as RowRejection,
  /** [UFF✓] campo non corretto; il caso documentato è la Data di Arrivo fuori finestra. */
  SCHEDINA_CAMPO_NON_CORRETTO: {
    errorCod: "12",
    errorDes: "SCHEDINA_CAMPO_NON_CORRETTO",
    errorDettaglio: "Data di Arrivo Errata",
  } as RowRejection,
} as const;

/** Modalità di TRASPORTO: simula la rete prima ancora del contenuto applicativo. */
export type TransportMode =
  | "ok" // risposta normale
  | "timeout" // connessione che non risponde → il client va in AbortController/timeout
  | "http-500" // HTTP 500 senza corpo SOAP interpretabile → errore transitorio
  | "soap-fault"; // SOAP Fault → errore di protocollo

export interface MockScenario {
  /** Trasporto. Default "ok". */
  transport?: TransportMode;
  /**
   * Forza il fallimento di autenticazione su GenerateToken/Authentication_Test a prescindere
   * dalle credenziali (es. simulare WSKey revocata). Default: non forzato (decidono le credenziali).
   */
  forceAuthFailure?: Partial<RowRejection>;
  /**
   * "Oggi" per il controllo della finestra Data di Arrivo (ISO YYYY-MM-DD). Sono accettate
   * SOLO le righe con data di arrivo = oggi o ieri (regola reale del portale → altrimenti cod. 12).
   * Default: la data odierna reale del sistema.
   */
  today?: string;
  /**
   * CASO CRITICO (azione irreversibile): su Send, il server ACQUISISCE le righe valide e POI la
   * connessione muore (il client vede un timeout). Lato server le righe risultano acquisite, ma
   * il nostro codice NON lo sa → deve andare in UNVERIFIED, mai ritentare alla cieca.
   */
  dropResponseAfterAcquire?: boolean;
  /**
   * Rifiuto per-riga CUSTOM (oltre a 11/12 derivati). Serve per scenari con codici NON presenti
   * nel repo (es. tipo documento raro): il test passa un codice [MOCK] esplicito. `null` = riga ok.
   */
  rejectRow?: (record: string, index: number) => RowRejection | null;
}

/** Una chiamata ricevuta dal mock (per le asserzioni dei test). */
export interface MockCall {
  method: string;
  utente?: string;
  token?: string;
  records?: string[];
  tabella?: string;
}

const NS = "AlloggiatiService";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1h, come il portale reale (token orario).

// Parser per le RICHIESTE in arrivo. trimValues:false è ESSENZIALE: il tracciato è a larghezza
// fissa, riempito di spazi a destra — trimmare ne falserebbe la lunghezza (e i controlli sul cod. 11).
const reqParser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: false,
});

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Mock server SOAP di Alloggiati Web. Stateful: conosce le credenziali valide, emette token
 * con scadenza, e tiene un registro delle righe "acquisite" (solo per le asserzioni dei test).
 */
export class AlloggiatiMockServer {
  readonly calls: MockCall[] = [];
  /** Quante volte ogni record è stato ACQUISITO lato server (per asserire l'assenza di doppioni). */
  readonly acquired = new Map<string, number>();

  private readonly credentials: MockCredential[];
  private readonly tokens = new Map<string, { utente: string; expiresMs: number }>();
  private scenario: MockScenario;
  private tokenSeq = 0;

  constructor(credentials: MockCredential | MockCredential[], scenario: MockScenario = {}) {
    this.credentials = Array.isArray(credentials) ? credentials : [credentials];
    this.scenario = scenario;
  }

  /** Cambia lo scenario a runtime (es. prima "ok", poi "timeout"). */
  setScenario(scenario: MockScenario): void {
    this.scenario = scenario;
  }

  /** Numero di chiamate ricevute per un dato metodo SOAP. */
  callCount(method: string): number {
    return this.calls.filter((c) => c.method === method).length;
  }

  /**
   * `fetch` SOAP da iniettare nel client reale:
   *   new AlloggiatiSoapClient({ fetchImpl: mock.fetch, timeoutMs })
   * È un arrow per preservare il `this` quando viene passata come valore.
   */
  readonly fetch: typeof fetch = (async (
    _input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const method = methodFromAction(init?.headers);
    const body = typeof init?.body === "string" ? init.body : "";
    const transport = this.scenario.transport ?? "ok";

    // 1) TRASPORTO: la rete può morire prima del contenuto applicativo.
    if (transport === "timeout") {
      // Non risolve mai: il client la abortisce via AbortController → AlloggiatiTransientError.
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal) {
          if (signal.aborted) reject(abortReason(signal));
          else signal.addEventListener("abort", () => reject(abortReason(signal)));
        }
      });
    }
    if (transport === "http-500") {
      return new Response("Internal Server Error", { status: 500 });
    }
    if (transport === "soap-fault") {
      return new Response(this.faultEnvelope("Errore interno simulato dal mock"), { status: 500 });
    }

    // 2) CONTENUTO APPLICATIVO (trasporto "ok").
    const parsed = reqParser.parse(body) as Record<string, unknown>;
    const env = (parsed.Envelope ?? {}) as Record<string, unknown>;
    const soapBody = (env.Body ?? {}) as Record<string, unknown>;

    switch (method) {
      case "GenerateToken":
        return this.handleGenerateToken(soapBody);
      case "Authentication_Test":
        return this.handleAuthenticationTest(soapBody);
      case "Test":
        return this.handleBatch(soapBody, "Test", init?.signal);
      case "Send":
        return this.handleBatch(soapBody, "Send", init?.signal);
      case "Tabella":
        return this.handleTabella(soapBody);
      default:
        return new Response(this.faultEnvelope(`Metodo sconosciuto: ${method}`), { status: 500 });
    }
  }) as typeof fetch;

  // ----------------------------- handler per metodo -----------------------------

  private handleGenerateToken(soapBody: Record<string, unknown>): Response {
    const node = (soapBody.GenerateToken ?? {}) as Record<string, unknown>;
    const utente = str(node.Utente);
    const password = str(node.Password);
    const wskey = str(node.WsKey);
    this.calls.push({ method: "GenerateToken", utente });

    const forced = this.scenario.forceAuthFailure;
    const credOk = this.credentials.some(
      (c) => c.utente === utente && c.password === password && c.wskey === wskey,
    );
    if (forced || !credOk) {
      const e = { ...ALLOGGIATI_ERROR.CREDENZIALI_NON_VALIDE, ...forced };
      return this.soap("GenerateTokenResponse", `<result>${esitoXml(false, e)}</result>`);
    }

    const token = `TOK_${utente}_${++this.tokenSeq}`;
    const issued = new Date();
    const expires = new Date(issued.getTime() + TOKEN_TTL_MS);
    this.tokens.set(token, { utente: utente!, expiresMs: expires.getTime() });
    return this.soap(
      "GenerateTokenResponse",
      `<GenerateTokenResult>` +
        `<issued>${issued.toISOString()}</issued>` +
        `<expires>${expires.toISOString()}</expires>` +
        `<token>${token}</token>` +
        `</GenerateTokenResult>` +
        `<result>${esitoXml(true)}</result>`,
    );
  }

  private handleAuthenticationTest(soapBody: Record<string, unknown>): Response {
    const node = (soapBody.Authentication_Test ?? {}) as Record<string, unknown>;
    const utente = str(node.Utente);
    const token = str(node.token);
    this.calls.push({ method: "Authentication_Test", utente, token });

    const ok = !this.scenario.forceAuthFailure && this.tokenValid(token, utente);
    const e = { ...ALLOGGIATI_ERROR.CREDENZIALI_NON_VALIDE, ...this.scenario.forceAuthFailure };
    return this.soap(
      "Authentication_TestResponse",
      `<Authentication_TestResult>${esitoXml(ok, ok ? undefined : e)}</Authentication_TestResult>`,
    );
  }

  /** Test e Send condividono richiesta/risposta: cambia solo l'effetto (Send acquisisce davvero). */
  private async handleBatch(
    soapBody: Record<string, unknown>,
    op: "Test" | "Send",
    signal: AbortSignal | null | undefined,
  ): Promise<Response> {
    const node = (soapBody[op] ?? {}) as Record<string, unknown>;
    const utente = str(node.Utente);
    const token = str(node.token);
    const elenco = (node.ElencoSchedine ?? {}) as Record<string, unknown>;
    const records = toArray(elenco.string).map((v) => String(v ?? ""));
    this.calls.push({ method: op, utente, token, records });

    // Token non valido → il server rifiuta l'intero batch (esito complessivo false, niente Dettaglio).
    if (!this.tokenValid(token, utente)) {
      return this.soap(
        `${op}Response`,
        `<${op}Result>${esitoXml(false, ALLOGGIATI_ERROR.CREDENZIALI_NON_VALIDE)}</${op}Result>` +
          `<result><SchedineValide>0</SchedineValide></result>`,
      );
    }

    // Esito riga-per-riga: prima i codici UFFICIALI derivati dal record (11, 12), poi il custom.
    const esiti = records.map((rec, i) => this.judgeRow(rec, i));

    // SOLO Send ha effetti: registra le righe valide come acquisite (per le asserzioni anti-doppione).
    if (op === "Send") {
      records.forEach((rec, i) => {
        if (esiti[i] === null) this.acquired.set(rec, (this.acquired.get(rec) ?? 0) + 1);
      });
      // CASO CRITICO: acquisito lato server, poi la connessione muore → il client vede un timeout.
      if (this.scenario.dropResponseAfterAcquire) {
        return new Promise<Response>((_resolve, reject) => {
          if (signal) {
            if (signal.aborted) reject(abortReason(signal));
            else signal.addEventListener("abort", () => reject(abortReason(signal)));
          }
        });
      }
    }

    const valide = esiti.filter((e) => e === null).length;
    const dettaglio = esiti
      .map(
        (e) =>
          `<EsitoOperazioneServizio>${esitoXml(e === null, e ?? undefined)}</EsitoOperazioneServizio>`,
      )
      .join("");
    return this.soap(
      `${op}Response`,
      `<${op}Result>${esitoXml(true)}</${op}Result>` +
        `<result><SchedineValide>${valide}</SchedineValide>` +
        `<Dettaglio>${dettaglio}</Dettaglio></result>`,
    );
  }

  /** Restituisce il rifiuto della riga, oppure `null` se la riga è valida. */
  private judgeRow(record: string, index: number): RowRejection | null {
    // (a) cod. 11 — formato: la lunghezza dev'essere 168 (standard) o 174 (file unico). [UFF✓]
    if (record.length !== TRACCIATO_LEN && record.length !== TRACCIATO_FILE_UNICO_LEN) {
      return ALLOGGIATI_ERROR.SCHEDINA_FORMATO_NON_CORRETTO;
    }
    // (b) cod. 12 — campo: Data di Arrivo dev'essere OGGI o IERI (finestra reale del portale). [UFF✓]
    const arrivoIso = arrivalIsoFromRecord(record);
    if (arrivoIso && !this.arrivalInWindow(arrivoIso)) {
      return ALLOGGIATI_ERROR.SCHEDINA_CAMPO_NON_CORRETTO;
    }
    // (c) rifiuto custom del test (codici [MOCK], non ufficiali).
    return this.scenario.rejectRow?.(record, index) ?? null;
  }

  private arrivalInWindow(arrivoIso: string): boolean {
    const todayIso = this.scenario.today ?? new Date().toISOString().slice(0, 10);
    const today = Date.parse(`${todayIso}T00:00:00Z`);
    const arrivo = Date.parse(`${arrivoIso}T00:00:00Z`);
    if (Number.isNaN(today) || Number.isNaN(arrivo)) return true; // non bloccare su date illeggibili
    const dayMs = 86_400_000;
    return arrivo === today || arrivo === today - dayMs;
  }

  private handleTabella(soapBody: Record<string, unknown>): Response {
    const node = (soapBody.Tabella ?? {}) as Record<string, unknown>;
    const tipo = str(node.tipo);
    const token = str(node.token);
    const utente = str(node.Utente);
    this.calls.push({ method: "Tabella", utente, token, tabella: tipo });
    if (!this.tokenValid(token, utente)) {
      return this.soap(
        "TabellaResponse",
        `<TabellaResult>${esitoXml(false, ALLOGGIATI_ERROR.CREDENZIALI_NON_VALIDE)}</TabellaResult>`,
      );
    }
    // CSV minimale, sufficiente a non far fallire un eventuale parsing; contenuto non significativo.
    const csv = "0;mock;riga;di;esempio";
    return this.soap(
      "TabellaResponse",
      `<TabellaResult>${esitoXml(true)}</TabellaResult><CSV>${esc(csv)}</CSV>`,
    );
  }

  // ----------------------------- helper -----------------------------

  private tokenValid(token: string | undefined, utente: string | undefined): boolean {
    if (!token) return false;
    const t = this.tokens.get(token);
    if (!t) return false;
    if (utente && t.utente !== utente) return false;
    return Date.now() < t.expiresMs;
  }

  private soap(responseTag: string, inner: string): Response {
    const xml =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
      `<${responseTag} xmlns="${NS}">${inner}</${responseTag}>` +
      "</soap:Body></soap:Envelope>";
    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "text/xml; charset=utf-8" },
    });
  }

  private faultEnvelope(message: string): string {
    return (
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>' +
      `<soap:Fault><faultcode>soap:Server</faultcode><faultstring>${esc(message)}</faultstring></soap:Fault>` +
      "</soap:Body></soap:Envelope>"
    );
  }
}

// ----------------------------- funzioni pure di supporto -----------------------------

/** Estrae il nome del metodo dall'header SOAPAction ("AlloggiatiService/Send" → "Send"). */
function methodFromAction(headers: HeadersInit | undefined): string {
  let action = "";
  if (headers instanceof Headers) action = headers.get("SOAPAction") ?? "";
  else if (Array.isArray(headers)) action = headers.find(([k]) => k === "SOAPAction")?.[1] ?? "";
  else if (headers) action = (headers as Record<string, string>).SOAPAction ?? "";
  return action.replace(/"/g, "").split("/").pop() ?? "";
}

/** Legge la Data di Arrivo (campo "gg/mm/aaaa" a offset 2..11) e la converte in ISO YYYY-MM-DD. */
function arrivalIsoFromRecord(record: string): string | undefined {
  const field = record.slice(2, 12);
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(field);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function str(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v);
  return s.length === 0 ? undefined : s;
}

/** Serializza un nodo esito nello stesso formato che il parser di produzione si aspetta. */
function esitoXml(esito: boolean, err?: RowRejection): string {
  let s = `<esito>${esito ? "true" : "false"}</esito>`;
  if (err) {
    s += `<ErroreCod>${esc(err.errorCod)}</ErroreCod><ErroreDes>${esc(err.errorDes)}</ErroreDes>`;
    if (err.errorDettaglio) s += `<ErroreDettaglio>${esc(err.errorDettaglio)}</ErroreDettaglio>`;
  }
  return s;
}

function abortReason(signal: AbortSignal): Error {
  const r = signal.reason;
  return r instanceof Error ? r : new Error("aborted");
}
