import type { SendOutcome } from "../soap/client";
import { AlloggiatiProtocolError } from "../soap/errors";
import type {
  AlloggiatiSender,
  SendBatch,
  SendBatchResult,
  SendRowResult,
} from "../ports/AlloggiatiSender";

/** Minimo per ottenere utente+token di una credenziale. Lo soddisfa `TokenManager`. */
export interface TokenProvider {
  getToken(credentialId: string): Promise<{ utente: string; token: string }>;
}

/** Minimo per inviare un batch via SOAP. Lo soddisfa `AlloggiatiSoapClient`. */
export interface SendClient {
  send(utente: string, token: string, righe: readonly string[]): Promise<SendOutcome>;
}

/**
 * Adapter REALE dell'invio (implementazione del port `AlloggiatiSender`):
 * traduce un `SendBatch` (correlationId + record) in una chiamata SOAP `Send` ad Alloggiati
 * e rimappa l'esito riga-per-riga sui correlationId, in ordine.
 *
 * IDEMPOTENZA / SICUREZZA (un doppione è IRREVERSIBILE → mai dedurre, mai ritentare alla cieca):
 *  - rete/timeout/SOAP Fault: il client LANCIA → l'eccezione si propaga → l'outbox manda tutto
 *    in UNVERIFIED (da riconciliare con la Ricevuta a T+1);
 *  - risposta AMBIGUA — esito complessivo `false`, oppure numero di dettagli ≠ numero di schedine
 *    inviate — NON è interpretabile riga-per-riga: lanciamo → UNVERIFIED.
 *  Applichiamo ACQUIRED/REJECTED SOLO su una risposta completa e 1:1 con l'input.
 *
 * ⚠️ [SUPPOSIZIONE — da verificare sul servizio reale] Assumiamo che `result.Dettaglio` contenga
 * un esito per OGNI schedina inviata, NELLO STESSO ORDINE dell'ElencoSchedine (come `Test`).
 * È l'assunzione già adottata dal client per `Test`. Il guard 1:1 qui sotto rende l'errore
 * "rumoroso" (→ UNVERIFIED) se così non fosse, invece di correlare esiti sbagliati.
 */
export class SoapAlloggiatiSender implements AlloggiatiSender {
  constructor(
    private readonly tokens: TokenProvider,
    private readonly client: SendClient,
  ) {}

  /**
   * Pre-autenticazione: ottiene un token valido SENZA inviare schedine. Se le credenziali sono
   * errate lancia AlloggiatiAuthError (deterministico) → l'outbox lascia le schedine PENDING.
   * Niente Send parte mai senza un token valido.
   */
  async prepare(credentialId: string): Promise<void> {
    await this.tokens.getToken(credentialId);
  }

  async send(batch: SendBatch): Promise<SendBatchResult> {
    const { utente, token } = await this.tokens.getToken(batch.credentialId);
    const records = batch.rows.map((r) => r.record);

    // Può lanciare (transient/protocol/auth): lasciamo propagare → outbox → UNVERIFIED.
    const outcome = await this.client.send(utente, token, records);

    // Guard idempotenza: solo una risposta completa e 1:1 è interpretabile per-riga.
    if (!outcome.overall.esito || outcome.righe.length !== batch.rows.length) {
      throw new AlloggiatiProtocolError(
        `Send: risposta ambigua/incompleta (esito=${outcome.overall.esito}, ` +
          `dettagli=${outcome.righe.length}/${batch.rows.length}). ` +
          `Schedine → UNVERIFIED: l'esito reale si riconcilia con la Ricevuta, mai dedotto.`,
      );
    }

    const results: SendRowResult[] = batch.rows.map((row, i): SendRowResult => {
      const r = outcome.righe[i];
      if (r.esito) {
        return { correlationId: row.correlationId, outcome: "ACQUIRED" };
      }
      return {
        correlationId: row.correlationId,
        outcome: "REJECTED",
        errorCod: r.errorCod,
        errorDes: r.errorDes,
      };
    });
    return { results };
  }
}
