import type { RecordIdentity } from "./tracciato";
import { AlloggiatiProtocolError } from "../soap/errors";

const RECEIPT_SEP = "\t";
const RECEIPT_HEADER = "#MOCK-RICEVUTA";

/** Decodifica il formato [MOCK] usato nei test (header + righe cognome\\tnome\\tdataNascitaISO). */
export function parseMockFormatReceiptBase64(pdfBase64: string): RecordIdentity[] {
  const text = Buffer.from(pdfBase64, "base64").toString("utf8");
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => {
      const [cognome = "", nome = "", dataNascita = ""] = line.split(RECEIPT_SEP);
      return { cognome, nome, dataNascita };
    });
}

/**
 * Estrae le identità acquisite da un PDF Ricevuta (base64).
 * Oggi: solo formato [MOCK] dei test. PDF reali (%PDF-) → errore esplicito finché Gate #0
 * non fornisce un campione con acquisizioni da analizzare.
 */
export function parseReceiptPdfBase64(pdfBase64: string): RecordIdentity[] {
  const buf = Buffer.from(pdfBase64, "base64");
  const head = buf.subarray(0, Math.min(32, buf.length)).toString("utf8");
  if (head.startsWith(RECEIPT_HEADER)) {
    return parseMockFormatReceiptBase64(pdfBase64);
  }
  if (buf.subarray(0, 5).toString("ascii") === "%PDF-") {
    throw new AlloggiatiProtocolError(
      "Parser PDF Ricevuta reale non ancora implementato: serve un campione da Gate #0 con acquisizioni.",
    );
  }
  throw new AlloggiatiProtocolError(
    "Ricevuta: payload decodificato non riconosciuto (né mock né PDF).",
  );
}
