// ADAPTER: estrazione testo dal PDF "Ricevuta di invio" (base64) → RicevutaSummary.
//
// Usa `unpdf` (pdf.js serverless-friendly, nessun binario nativo: gira su Vercel).
// L'estrazione è volutamente separata dal parsing (domain/ricevuta-summary.ts, puro):
// se in futuro cambiamo libreria PDF, il dominio non si tocca.

import { extractText } from "unpdf";
import { AlloggiatiProtocolError } from "../soap/errors";
import { parseRicevutaSummaryText, type RicevutaSummary } from "../domain/ricevuta-summary";

/** Estrae il testo (pagine unite) da un PDF in base64. */
export async function extractPdfTextFromBase64(pdfBase64: string): Promise<string> {
  const buf = Buffer.from(pdfBase64, "base64");
  if (buf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new AlloggiatiProtocolError("Ricevuta: payload non è un PDF (magic '%PDF-' assente).");
  }
  try {
    const { text } = await extractText(new Uint8Array(buf), { mergePages: true });
    return text;
  } catch (e) {
    throw new AlloggiatiProtocolError(
      `Ricevuta: estrazione testo dal PDF fallita: ${(e as Error).message}`,
    );
  }
}

/** PDF Ricevuta (base64) → RicevutaSummary. */
export async function parseRicevutaSummaryPdfBase64(pdfBase64: string): Promise<RicevutaSummary> {
  const text = await extractPdfTextFromBase64(pdfBase64);
  return parseRicevutaSummaryText(text);
}
