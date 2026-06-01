// Export CSV della dichiarazione, pronto per l'invio al comune. PURO (dati in → stringa out).
// Separatore ";" (convenzione IT/Excel); importi in euro con virgola decimale; righe CRLF.

import { formatEuroCents } from "../services/estimate.service";

export interface DeclarationLineExport {
  propertyName: string;
  stayId: string;
  taxedNights: number;
  amountCents: number;
}

export interface DeclarationExport {
  comuneName: string;
  periodLabel: string;
  totalCents: number;
  lines: DeclarationLineExport[];
}

/** Quota un campo CSV se contiene separatore, virgolette o a-capo. */
function csvField(value: string): string {
  if (/[";\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function row(cells: string[]): string {
  return cells.map(csvField).join(";");
}

/** CSV della dichiarazione: intestazione, una riga per soggiorno, riga totale. Deterministico. */
export function toDeclarationCsv(d: DeclarationExport): string {
  const euro = (c: number) => formatEuroCents(c).replace(" €", "");
  const out: string[] = [];
  out.push(row(["Comune", d.comuneName]));
  out.push(row(["Periodo", d.periodLabel]));
  out.push("");
  out.push(row(["Struttura", "ID soggiorno", "Notti tassate", "Imposta (€)"]));
  for (const l of d.lines) {
    out.push(row([l.propertyName, l.stayId, String(l.taxedNights), euro(l.amountCents)]));
  }
  out.push(row(["TOTALE", "", "", euro(d.totalCents)]));
  return out.join("\r\n");
}
