import type { AlloggiatiSecret } from "../../../secrets";
import {
  AlloggiatiAuthError,
  AlloggiatiProtocolError,
  AlloggiatiReceiptError,
  AlloggiatiReceiptUnavailableError,
  AlloggiatiTransientError,
  type EsitoServizio,
} from "./errors";
import { isReceiptUnavailable } from "./receipt-codes";
import {
  buildAuthenticationTestEnvelope,
  buildGenerateTokenEnvelope,
  buildRicevutaEnvelope,
  buildSendEnvelope,
  buildTabellaEnvelope,
  buildTestEnvelope,
  soapAction,
} from "./envelopes";
import { normalizeStr, parseEnvelope, readEsito, toArray } from "./parse";

const DEFAULT_ENDPOINT = "https://alloggiatiweb.poliziadistato.it/service/service.asmx";
const DEFAULT_TIMEOUT_MS = 20_000;

export interface SoapClientConfig {
  endpoint?: string;
  timeoutMs?: number;
  /** Iniettabile per i test. Default: fetch globale. */
  fetchImpl?: typeof fetch;
}

export interface TokenResult {
  utente: string;
  token: string;
  issued: Date;
  expires: Date;
}

/** Esito per singola schedina dentro un batch (Test o Send). */
export interface BatchRowResult {
  index: number;
  esito: boolean;
  errorCod?: string;
  errorDes?: string;
  errorDettaglio?: string;
}

/** Esito di un'operazione di batch. Test e Send condividono la stessa forma di risposta. */
export interface BatchOutcome {
  /** Esito complessivo dell'operazione (true = eseguita; gli errori per-riga sono in `righe`). */
  overall: EsitoServizio;
  schedineValide: number;
  righe: BatchRowResult[];
}

// Alias storici/semantici: la struttura è identica, cambia solo l'operazione.
export type TestRowResult = BatchRowResult;
export type TestResult = BatchOutcome;
export type SendOutcome = BatchOutcome;

/**
 * Client SOAP 1.1 per Alloggiati Web: GenerateToken, Authentication_Test, Test e Send.
 *
 * `Test` (validazione, ripetibile) e `Send` (acquisizione reale, IRREVERSIBILE) hanno la
 * stessa identica struttura di richiesta/risposta nel WSDL: condividono il parsing.
 *
 * Classificazione errori:
 *  - rete/timeout/HTTP 5xx       → AlloggiatiTransientError (ritentabile)
 *  - SOAP Fault / risposta strana → AlloggiatiProtocolError
 *  - esito=false su Token/Auth    → AlloggiatiAuthError
 *  - errori di VALIDAZIONE schedine (Test/Send) → restituiti in BatchOutcome.righe (NON lanciati)
 */
export class AlloggiatiSoapClient {
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: SoapClientConfig = {}) {
    this.endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async generateToken(secret: AlloggiatiSecret): Promise<TokenResult> {
    const body = await this.call(
      "GenerateToken",
      buildGenerateTokenEnvelope(secret.utente, secret.password, secret.wskey),
    );
    const resp = (body.GenerateTokenResponse ?? {}) as Record<string, unknown>;
    const esito = readEsito(resp.result);
    if (!esito.esito) {
      throw new AlloggiatiAuthError(
        `GenerateToken fallito: ${esito.errorDes ?? esito.errorCod ?? "credenziali non valide"}`,
        esito,
      );
    }
    const tokenNode = (resp.GenerateTokenResult ?? {}) as Record<string, unknown>;
    const token = normalizeStr(tokenNode.token);
    const expires = parseDate(tokenNode.expires);
    const issued = parseDate(tokenNode.issued);
    if (!token || !expires) {
      throw new AlloggiatiProtocolError("GenerateToken: risposta priva di token o scadenza.");
    }
    return { utente: secret.utente, token, issued: issued ?? new Date(), expires };
  }

  async authenticationTest(utente: string, token: string): Promise<void> {
    const body = await this.call(
      "Authentication_Test",
      buildAuthenticationTestEnvelope(utente, token),
    );
    const resp = (body.Authentication_TestResponse ?? {}) as Record<string, unknown>;
    const esito = readEsito(resp.Authentication_TestResult);
    if (!esito.esito) {
      throw new AlloggiatiAuthError(
        `Authentication_Test fallito: ${esito.errorDes ?? esito.errorCod ?? "token non valido"}`,
        esito,
      );
    }
  }

  /** VALIDA le schedine senza acquisirle. Ripetibile a volontà (nessun effetto). */
  async test(utente: string, token: string, righe: readonly string[]): Promise<TestResult> {
    const body = await this.call("Test", buildTestEnvelope(utente, token, righe));
    return this.extractBatchOutcome(body, "TestResponse", "TestResult");
  }

  /**
   * ACQUISISCE davvero le schedine. ⚠️ IRREVERSIBILE: non esiste un metodo per annullare/
   * correggere una schedina già acquisita (le correzioni passano dalla Questura). Per questo
   * l'adapter/outbox non ritenta MAI alla cieca un Send senza risposta certa.
   */
  async send(utente: string, token: string, righe: readonly string[]): Promise<SendOutcome> {
    const body = await this.call("Send", buildSendEnvelope(utente, token, righe));
    return this.extractBatchOutcome(body, "SendResponse", "SendResult");
  }

  /** Parsing condiviso da Test e Send: esito complessivo + esiti riga-per-riga (in ordine). */
  private extractBatchOutcome(
    body: Record<string, unknown>,
    responseKey: string,
    resultKey: string,
  ): BatchOutcome {
    const resp = (body[responseKey] ?? {}) as Record<string, unknown>;
    const overall = readEsito(resp[resultKey]);
    const result = (resp.result ?? {}) as Record<string, unknown>;
    const dettaglio = toArray(
      (result.Dettaglio as Record<string, unknown> | undefined)?.EsitoOperazioneServizio,
    );
    const righe: BatchRowResult[] = dettaglio.map((d, i) => {
      const e = readEsito(d);
      return {
        index: i,
        esito: e.esito,
        errorCod: e.errorCod,
        errorDes: e.errorDes,
        errorDettaglio: e.errorDettaglio,
      };
    });
    return {
      overall,
      schedineValide: Number(normalizeStr(result.SchedineValide) ?? "0"),
      righe,
    };
  }

  /**
   * Scarica una tabella di riferimento come CSV grezzo (separato da ";").
   * Struttura VERIFICATA dal WSDL: `TabellaResponse` → `TabellaResult` (esito) + `CSV` (stringa).
   * I valori validi di `tipo` (enum TipoTabella) sono: Luoghi, Tipi_Documento, Tipi_Alloggiato,
   * TipoErrore, ListaAppartamenti.
   */
  async tabella(utente: string, token: string, tipo: string): Promise<string> {
    const body = await this.call("Tabella", buildTabellaEnvelope(utente, token, tipo));
    const resp = (body.TabellaResponse ?? {}) as Record<string, unknown>;
    const esito = readEsito(resp.TabellaResult);
    if (!esito.esito) {
      throw new AlloggiatiAuthError(
        `Tabella "${tipo}" fallita: ${esito.errorDes ?? esito.errorCod ?? "token non valido o tipo errato"}`,
        esito,
      );
    }
    const csv = normalizeStr(resp.CSV);
    if (csv === undefined) {
      throw new AlloggiatiProtocolError(`Tabella "${tipo}": risposta priva del campo CSV.`);
    }
    return csv;
  }

  /**
   * Scarica la RICEVUTA (PDF, codificato base64) delle schedine acquisite in un dato giorno.
   * ⚠️ Vincolo reale: SOLO giorni passati — il server rifiuta il giorno corrente (esito false).
   * ⚠️ [SUPPOSIZIONE] struttura della risposta (`RicevutaResponse` → `RicevutaResult` esito + `PDF`
   * base64) e nome del campo da confermare sul WSDL reale. Il CONTENUTO del PDF è opaco e NON
   * documentato: l'estrazione dei nominativi (per la riconciliazione T+1) è demandata a un adapter
   * dedicato — vedi il port AcquisitionReceiptReader — perché qui non possiamo assumerne il formato.
   */
  async ricevuta(utente: string, token: string, data: string): Promise<{ pdfBase64: string }> {
    const body = await this.call("Ricevuta", buildRicevutaEnvelope(utente, token, data));
    const resp = (body.RicevutaResponse ?? {}) as Record<string, unknown>;
    const esito = readEsito(resp.RicevutaResult);
    if (!esito.esito) {
      const msg = `Ricevuta "${data}" non disponibile: ${esito.errorDes ?? esito.errorCod ?? "errore sconosciuto"}`;
      if (isReceiptUnavailable(esito)) {
        throw new AlloggiatiReceiptUnavailableError(msg, esito);
      }
      // Token/credenziali invalide su Ricevuta restano auth (cod. 1 osservato altrove).
      if (esito.errorCod === "1") {
        throw new AlloggiatiAuthError(msg, esito);
      }
      throw new AlloggiatiReceiptError(msg, esito);
    }
    const pdfBase64 = normalizeStr(resp.PDF);
    if (pdfBase64 === undefined) {
      throw new AlloggiatiProtocolError(`Ricevuta "${data}": risposta priva del campo PDF.`);
    }
    return { pdfBase64 };
  }

  private async call(method: string, envelope: string): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error("timeout")), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: `"${soapAction(method)}"`,
        },
        body: envelope,
        signal: controller.signal,
      });
    } catch (e) {
      throw new AlloggiatiTransientError(
        `Errore di rete chiamando ${method}: ${(e as Error).message}`,
        { cause: e },
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();
    let parsed: ReturnType<typeof parseEnvelope>;
    try {
      parsed = parseEnvelope(text);
    } catch (e) {
      if (!res.ok) {
        throw new AlloggiatiTransientError(`HTTP ${res.status} su ${method}`, {
          httpStatus: res.status,
        });
      }
      throw new AlloggiatiProtocolError(
        `Risposta non interpretabile da ${method}: ${(e as Error).message}`,
        {
          httpStatus: res.status,
          bodyExcerpt: text.slice(0, 300),
        },
      );
    }

    // Un SOAP Fault è informativo anche con HTTP 500: lo gestiamo prima dello status.
    if (parsed.fault) {
      throw new AlloggiatiProtocolError(
        `SOAP Fault su ${method}: ${parsed.fault.faultstring ?? parsed.fault.faultcode ?? "fault"}`,
        { fault: parsed.fault, httpStatus: res.status },
      );
    }
    if (!res.ok) {
      throw new AlloggiatiTransientError(`HTTP ${res.status} su ${method}`, {
        httpStatus: res.status,
      });
    }
    return parsed.body;
  }
}

function parseDate(v: unknown): Date | undefined {
  const s = normalizeStr(v);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}
