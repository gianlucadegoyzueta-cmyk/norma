// Export PDF della dichiarazione, pronto da stampare/allegare per il versamento al comune.
// PURO rispetto ai dati (DeclarationExport in → byte PDF out); usa pdf-lib (puro JS, nessun
// binario nativo → sicuro su serverless/Vercel). Font standard Helvetica (WinAnsi: supporta € e
// gli accenti italiani). Layout sobrio coerente col brand (accento terracotta).

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DeclarationExport } from "./export-csv";
import { formatTakeRateBps } from "./take-rate";
import { formatEuroCents } from "../services/estimate.service";

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 50;
const TERRACOTTA = rgb(0.737, 0.294, 0.169); // #bc4b2b
const INK = rgb(0.13, 0.11, 0.08); // inchiostro
const SOFT = rgb(0.36, 0.33, 0.28); // inchiostro-soft
const HAIRLINE = rgb(0.83, 0.79, 0.72);

/** Sostituisce i caratteri non rappresentabili dai font standard (fuori WinAnsi) per non lanciare. */
function safe(s: string): string {
  return Array.from(s)
    .map((ch) => (ch === "€" || ch.charCodeAt(0) <= 255 ? ch : "?"))
    .join("");
}

/** Colonne della tabella: posizione X e allineamento. */
const COLS = [
  { key: "struttura", label: "Struttura", x: MARGIN, align: "left" as const },
  { key: "cin", label: "CIN", x: 250, align: "left" as const },
  { key: "notti", label: "Notti", x: 400, align: "right" as const },
  { key: "imposta", label: "Imposta", x: A4.w - MARGIN, align: "right" as const },
];

/** Genera il PDF della dichiarazione: intestazione, tabella per soggiorno, totale. Deterministico. */
export async function toDeclarationPdf(d: DeclarationExport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Dichiarazione tassa di soggiorno — ${d.comuneName} — ${d.periodLabel}`);
  doc.setCreator("Norma");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([A4.w, A4.h]);
  let y = A4.h - MARGIN;

  const text = (
    s: string,
    x: number,
    yy: number,
    opts: { size?: number; font?: typeof font; color?: typeof INK; align?: "left" | "right" } = {},
  ) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 10;
    const str = safe(s);
    const tx = opts.align === "right" ? x - f.widthOfTextAtSize(str, size) : x;
    page.drawText(str, { x: tx, y: yy, size, font: f, color: opts.color ?? INK });
  };

  // Intestazione
  text("Norma", MARGIN, y, { size: 12, font: bold, color: TERRACOTTA });
  y -= 26;
  text("Dichiarazione tassa di soggiorno", MARGIN, y, { size: 18, font: bold });
  y -= 22;
  text(`Comune di ${d.comuneName}`, MARGIN, y, { size: 11, color: SOFT });
  y -= 15;
  text(`Periodo: ${d.periodLabel}`, MARGIN, y, { size: 11, color: SOFT });
  y -= 28;

  const drawHeader = () => {
    for (const c of COLS)
      text(c.label, c.x, y, { size: 9, font: bold, color: SOFT, align: c.align });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: A4.w - MARGIN, y },
      thickness: 1,
      color: TERRACOTTA,
    });
    y -= 16;
  };
  drawHeader();

  const euro = (c: number) => formatEuroCents(c);
  for (const l of d.lines) {
    if (y < MARGIN + 60) {
      page = doc.addPage([A4.w, A4.h]);
      y = A4.h - MARGIN;
      drawHeader();
    }
    text(l.propertyName, COLS[0].x, y, { size: 10 });
    text(l.cin ?? "-", COLS[1].x, y, { size: 10, color: l.cin ? INK : SOFT });
    text(String(l.taxedNights), COLS[2].x, y, { size: 10, align: "right" });
    text(euro(l.amountCents), COLS[3].x, y, { size: 10, align: "right" });
    y -= 8;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: A4.w - MARGIN, y },
      thickness: 0.5,
      color: HAIRLINE,
    });
    y -= 14;
  }

  // Totale lordo riscosso
  y -= 6;
  const hasFee = !!d.fee && d.fee.takeRateBps > 0;
  text(hasFee ? "LORDO RISCOSSO" : "TOTALE", COLS[2].x, y, {
    size: 11,
    font: bold,
    align: "right",
  });
  text(euro(d.totalCents), COLS[3].x, y, {
    size: 11,
    font: bold,
    color: hasFee ? INK : TERRACOTTA,
    align: "right",
  });

  // Ripartizione servizio Norma (solo se applicata): fee trattenuta + netto al comune
  if (hasFee && d.fee) {
    y -= 18;
    text(`Servizio Norma (${formatTakeRateBps(d.fee.takeRateBps)})`, COLS[2].x, y, {
      size: 10,
      color: SOFT,
      align: "right",
    });
    text(`- ${euro(d.fee.normaFeeCents)}`, COLS[3].x, y, { size: 10, color: SOFT, align: "right" });
    y -= 18;
    text("NETTO DA VERSARE AL COMUNE", COLS[2].x, y, { size: 11, font: bold, align: "right" });
    text(euro(d.fee.comuneNetCents), COLS[3].x, y, {
      size: 11,
      font: bold,
      color: TERRACOTTA,
      align: "right",
    });
  }

  // Piè di pagina
  text(
    "Documento generato da Norma - norma.casa. Importi calcolati secondo le regole del comune.",
    MARGIN,
    MARGIN - 14,
    { size: 8, color: SOFT },
  );

  return doc.save();
}
