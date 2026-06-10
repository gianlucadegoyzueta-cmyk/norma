import type { AlloggiatiSoapClient } from "../soap/client";
import { AlloggiatiReceiptUnavailableError } from "../soap/errors";
import type { TokenProvider } from "./SoapAlloggiatiSender";
import { parseRicevutaSummaryPdfBase64 } from "./ricevuta-pdf-text";
import type { RicevutaSummary } from "../domain/ricevuta-summary";
import type { RicevutaSummaryReader } from "../ports/RicevutaSummaryReader";

/**
 * Lettore produzione del riepilogo Ricevuta via SOAP: TokenManager → Ricevuta → estrazione testo
 * PDF → parsing aggregato (`parseRicevutaSummaryPdfBase64`).
 *
 * `ERRORE_RECUPERO_RICEVUTA` (giorno senza acquisizioni) → `null`, non eccezione: per la
 * riconciliazione equivale a "0 schedine inviate quel giorno" (vedi RicevutaSummaryReader).
 */
export class SoapRicevutaSummaryReader implements RicevutaSummaryReader {
  constructor(
    private readonly tokens: TokenProvider,
    private readonly client: Pick<AlloggiatiSoapClient, "ricevuta">,
  ) {}

  async summaryOn(credentialId: string, dateIso: string): Promise<RicevutaSummary | null> {
    const { utente, token } = await this.tokens.getToken(credentialId);
    try {
      const { pdfBase64 } = await this.client.ricevuta(utente, token, dateIso);
      return await parseRicevutaSummaryPdfBase64(pdfBase64);
    } catch (err) {
      if (err instanceof AlloggiatiReceiptUnavailableError) return null;
      throw err;
    }
  }
}
