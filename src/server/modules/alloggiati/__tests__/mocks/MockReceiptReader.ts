// Adapter di TEST del port AcquisitionReceiptReader, mock-backed ma attraverso lo STACK REALE.
//
// Esercita davvero: TokenManager (token per la credenziale) → AlloggiatiSoapClient.ricevuta (envelope
// SOAP `Ricevuta` + parsing) → mock server. L'unico pezzo "finto" è il PARSING del PDF: il formato
// reale è ignoto (vedi port + README), quindi qui decodifichiamo il payload [MOCK] del mock server.
// In produzione, questa è esattamente la classe da rimpiazzare con un parser del PDF reale.

import type { AlloggiatiSoapClient } from "../../soap/client";
import type { TokenProvider } from "../../adapters/SoapAlloggiatiSender";
import type {
  AcquiredIdentity,
  AcquisitionReceiptReader,
} from "../../ports/AcquisitionReceiptReader";
import { decodeMockReceiptPdf } from "./AlloggiatiMockServer";

export class MockReceiptReader implements AcquisitionReceiptReader {
  constructor(
    private readonly tokens: TokenProvider,
    private readonly client: Pick<AlloggiatiSoapClient, "ricevuta">,
  ) {}

  async acquiredOn(credentialId: string, dateIso: string): Promise<AcquiredIdentity[]> {
    const { utente, token } = await this.tokens.getToken(credentialId);
    const { pdfBase64 } = await this.client.ricevuta(utente, token, dateIso);
    return decodeMockReceiptPdf(pdfBase64);
  }
}
