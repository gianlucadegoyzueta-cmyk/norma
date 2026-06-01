import type { AlloggiatiSoapClient } from "../soap/client";
import { AlloggiatiReceiptUnavailableError } from "../soap/errors";
import type { TokenProvider } from "./SoapAlloggiatiSender";
import { parseReceiptPdfBase64 } from "../domain/receipt-pdf";
import type { AcquiredIdentity, AcquisitionReceiptReader } from "../ports/AcquisitionReceiptReader";

/**
 * Lettore produzione della Ricevuta via SOAP: TokenManager → Ricevuta → parse PDF.
 * `ERRORE_RECUPERO_RICEVUTA` (giorno senza acquisizioni) → lista vuota, non eccezione.
 */
export class SoapAcquisitionReceiptReader implements AcquisitionReceiptReader {
  constructor(
    private readonly tokens: TokenProvider,
    private readonly client: Pick<AlloggiatiSoapClient, "ricevuta">,
  ) {}

  async acquiredOn(credentialId: string, dateIso: string): Promise<AcquiredIdentity[]> {
    const { utente, token } = await this.tokens.getToken(credentialId);
    try {
      const { pdfBase64 } = await this.client.ricevuta(utente, token, dateIso);
      return parseReceiptPdfBase64(pdfBase64);
    } catch (err) {
      if (err instanceof AlloggiatiReceiptUnavailableError) return [];
      throw err;
    }
  }
}
