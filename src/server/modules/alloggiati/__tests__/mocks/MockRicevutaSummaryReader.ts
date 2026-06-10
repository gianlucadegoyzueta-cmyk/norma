// Adapter di TEST del port RicevutaSummaryReader, mock-backed ma attraverso lo STACK REALE.
//
// Esercita davvero: TokenManager → AlloggiatiSoapClient.ricevuta (envelope SOAP `Ricevuta` +
// parsing) → mock server. L'unico pezzo "finto" è il formato del PDF: il mock server emette il
// formato [MOCK] (vedi domain/receipt-pdf.ts); qui ne CONTIAMO le righe per ottenere il dato
// aggregato che la Ricevuta reale espone direttamente ("SCHEDINE INVIATE", vedi DECISIONS D3/D4).
//
// In produzione l'equivalente è SoapRicevutaSummaryReader (PDF reale → parseRicevutaSummaryPdfBase64).

import type { AlloggiatiSoapClient } from "../../soap/client";
import { AlloggiatiReceiptUnavailableError } from "../../soap/errors";
import type { TokenProvider } from "../../adapters/SoapAlloggiatiSender";
import { parseMockFormatReceiptBase64 } from "../../domain/receipt-pdf";
import type { RicevutaSummary } from "../../domain/ricevuta-summary";
import type { RicevutaSummaryReader } from "../../ports/RicevutaSummaryReader";

export class MockRicevutaSummaryReader implements RicevutaSummaryReader {
  constructor(
    private readonly tokens: TokenProvider,
    private readonly client: Pick<AlloggiatiSoapClient, "ricevuta">,
  ) {}

  async summaryOn(credentialId: string, dateIso: string): Promise<RicevutaSummary | null> {
    const { utente, token } = await this.tokens.getToken(credentialId);
    try {
      const { pdfBase64 } = await this.client.ricevuta(utente, token, dateIso);
      const schedineInviate = parseMockFormatReceiptBase64(pdfBase64).length;
      return {
        login: utente,
        categoria: null,
        struttura: null,
        comune: null,
        indirizzo: null,
        pivaCodiceFiscale: null,
        idRicevuta: `MOCK/${dateIso}`,
        dataInvio: dateIso,
        schedineInviate,
        ggPermanenzaTotale: null,
        questura: null,
      };
    } catch (err) {
      // Giorno senza acquisizioni → nessuna ricevuta → "0 schedine inviate" (vedi port).
      if (err instanceof AlloggiatiReceiptUnavailableError) return null;
      throw err;
    }
  }
}
