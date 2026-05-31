/** Analisi strutturale del buffer PDF Ricevuta senza librerie esterne (Gate #0). */

export type Gate0PdfAnalysis = {
  sizeBytes: number;
  isPdfMagic: boolean;
  magicHex: string;
  printableSnippets: string[];
  datePatterns: string[];
  parserHints: string[];
};

export function analyzeReceiptPdfBuffer(buf: Buffer): Gate0PdfAnalysis {
  const magicHex = buf.subarray(0, Math.min(8, buf.length)).toString("hex");
  const isPdfMagic = buf.subarray(0, 5).toString("ascii") === "%PDF-";

  const raw = buf.toString("latin1");
  const snippetSet = new Set<string>();
  for (const m of raw.matchAll(/[\x20-\x7E\u00C0-\u024F]{6,80}/g)) {
    const s = m[0].trim();
    if (s.length >= 6 && !/^[\d\s./\\]+$/.test(s)) snippetSet.add(s);
  }
  const printableSnippets = [...snippetSet].slice(0, 40);

  const datePatterns = [
    ...new Set([
      ...(raw.match(/\d{2}\/\d{2}\/\d{4}/g) ?? []),
      ...(raw.match(/\d{4}-\d{2}-\d{2}/g) ?? []),
    ]),
  ].slice(0, 20);

  const parserHints: string[] = [];
  if (!isPdfMagic) {
    parserHints.push("Il payload decodificato NON inizia con %PDF- — verificare encoding/campo SOAP.");
  }
  if (printableSnippets.length === 0) {
    parserHints.push(
      "Nessun testo leggibile in chiaro: PDF probabilmente compresso → serve parser PDF (pdf-parse/poppler).",
    );
  } else {
    parserHints.push(
      `${printableSnippets.length} snippet testuali grezzi estratti — candidati per match nominativi in riconciliazione T+1.`,
    );
  }

  return {
    sizeBytes: buf.length,
    isPdfMagic,
    magicHex,
    printableSnippets,
    datePatterns,
    parserHints,
  };
}
