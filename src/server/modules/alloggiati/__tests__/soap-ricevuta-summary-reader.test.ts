import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { SoapRicevutaSummaryReader } from "../adapters/SoapRicevutaSummaryReader";
import { AlloggiatiReceiptUnavailableError } from "../soap/errors";

/**
 * Test dell'adapter di produzione del riepilogo Ricevuta: genera un PDF VERO con pdf-lib
 * (così esercita davvero extractText/unpdf + parser, non solo i mock) e verifica:
 *  - PDF valido → RicevutaSummary con il conteggio corretto;
 *  - ERRORE_RECUPERO_RICEVUTA (giorno senza acquisizioni) → null (non eccezione);
 *  - altri errori → propagati;
 *  - utente/token/data passati al client SOAP.
 */

const tokens = { getToken: async () => ({ utente: "RM999999", token: "tok-123" }) };

/** Costruisce un PDF Ricevuta (base64) con il conteggio dato, layout fedele al campione reale. */
async function ricevutaPdfBase64(schedineInviate: number): Promise<string> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const lines = [
    "POLIZIA DI STATO Servizio Alloggiati",
    "RICEVUTA DI INVIO",
    "LOGIN XX000000",
    "CATEGORIA APP.TO USO TURISTICO/LOCAZIONE PURA",
    "STRUTTURA ROSSI MARIO 01.01.1980",
    "COMUNE ROMA (RM)",
    "INDIRIZZO VIA ESEMPIO CIV. 1 PIANO T",
    "P.IVA/C.F. RSSMRA80A01H501X",
    "ID. RICEVUTA 2026/000001 [RM]",
    "DATA DI INVIO 25/03/2026",
    `SCHEDINE INVIATE ${schedineInviate}`,
    "GG PERMANENZA PRESUNTA TOT. 6",
    "ALLA QUESTURA ROMA",
    "Codice di Controllo (Firma)",
  ];
  let y = 800;
  for (const line of lines) {
    page.drawText(line, { x: 40, y, size: 10, font });
    y -= 20;
  }
  const bytes = await doc.save();
  return Buffer.from(bytes).toString("base64");
}

describe("SoapRicevutaSummaryReader", () => {
  it("PDF valido → RicevutaSummary con conteggio", async () => {
    const calls: string[][] = [];
    const client = {
      ricevuta: async (utente: string, token: string, data: string) => {
        calls.push([utente, token, data]);
        return { pdfBase64: await ricevutaPdfBase64(2) };
      },
    };
    const reader = new SoapRicevutaSummaryReader(tokens, client);

    const summary = await reader.summaryOn("cred_1", "2026-03-25");

    expect(summary?.schedineInviate).toBe(2);
    expect(summary?.dataInvio).toBe("2026-03-25");
    expect(calls).toEqual([["RM999999", "tok-123", "2026-03-25"]]);
  });

  it("schedineInviate 0 → riepilogo con conteggio 0 (non null)", async () => {
    const client = { ricevuta: async () => ({ pdfBase64: await ricevutaPdfBase64(0) }) };
    const summary = await new SoapRicevutaSummaryReader(tokens, client).summaryOn(
      "cred_1",
      "2026-03-25",
    );
    expect(summary?.schedineInviate).toBe(0);
  });

  it("ERRORE_RECUPERO_RICEVUTA → null", async () => {
    const client = {
      ricevuta: async () => {
        throw new AlloggiatiReceiptUnavailableError("nessuna ricevuta per il giorno");
      },
    };
    const summary = await new SoapRicevutaSummaryReader(tokens, client).summaryOn(
      "cred_1",
      "2026-03-25",
    );
    expect(summary).toBeNull();
  });

  it("altri errori sono propagati", async () => {
    const client = {
      ricevuta: async () => {
        throw new Error("rete giù");
      },
    };
    await expect(
      new SoapRicevutaSummaryReader(tokens, client).summaryOn("cred_1", "2026-03-25"),
    ).rejects.toThrow("rete giù");
  });
});
