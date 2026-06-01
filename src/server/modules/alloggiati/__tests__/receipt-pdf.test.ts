import { describe, expect, it } from "vitest";
import { buildTracciatoRecord } from "../domain/tracciato";
import { parseMockFormatReceiptBase64, parseReceiptPdfBase64 } from "../domain/receipt-pdf";
import { AlloggiatiProtocolError } from "../soap/errors";

describe("parseReceiptPdfBase64", () => {
  it("decodifica il formato mock", () => {
    const record = buildTracciatoRecord({
      tipoAlloggiato: "OSPITE_SINGOLO",
      dataArrivo: "2026-06-01",
      giorniPermanenza: 2,
      cognome: "ROSSI",
      nome: "MARIO",
      sesso: "M",
      dataNascita: "1990-05-20",
      statoNascitaCode: "100000100",
      cittadinanzaCode: "100000100",
      comuneNascitaCode: "058091001",
      provinciaNascita: "RM",
      tipoDocumentoCode: "IDELE",
      numeroDocumento: "AB1234567",
      luogoRilascioCode: "058091001",
    });
    const pdfBase64 = Buffer.from("#MOCK-RICEVUTA\nROSSI\tMARIO\t1990-05-20", "utf8").toString(
      "base64",
    );
    expect(parseMockFormatReceiptBase64(pdfBase64)).toEqual([
      { cognome: "ROSSI", nome: "MARIO", dataNascita: "1990-05-20" },
    ]);
    expect(parseReceiptPdfBase64(pdfBase64)).toEqual([
      { cognome: "ROSSI", nome: "MARIO", dataNascita: "1990-05-20" },
    ]);
    void record;
  });

  it("PDF reale → errore esplicito (parser non ancora implementato)", () => {
    const pdfBase64 = Buffer.from("%PDF-1.4 mock", "ascii").toString("base64");
    expect(() => parseReceiptPdfBase64(pdfBase64)).toThrow(AlloggiatiProtocolError);
  });
});
