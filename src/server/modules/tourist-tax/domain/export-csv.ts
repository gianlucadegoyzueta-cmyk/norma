// Export CSV della dichiarazione, pronto per l'invio al comune. PURO (dati in → stringa out).
// Separatore ";" (convenzione IT/Excel); importi in euro con virgola decimale; righe CRLF.

import { formatTakeRateBps } from "./take-rate";
import { formatEuroCents } from "../services/estimate.service";

export interface DeclarationLineExport {
  propertyName: string;
  /** CIN dell'immobile (Codice Identificativo Nazionale), se presente e conforme. Colonna vuota se assente. */
  cin?: string | null;
  stayId: string;
  taxedNights: number;
  amountCents: number;
}

/** Ripartizione commissione Norma da mostrare nell'export. Presente solo se take-rate > 0. */
export interface DeclarationFeeExport {
  takeRateBps: number;
  normaFeeCents: number;
  comuneNetCents: number;
}

export interface DeclarationExport {
  comuneName: string;
  periodLabel: string;
  /** Lordo riscosso: somma delle righe (l'imposta dovuta dagli ospiti). */
  totalCents: number;
  /** Ripartizione servizio Norma (opzionale: assente = nessuna commissione applicata). */
  fee?: DeclarationFeeExport;
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
  out.push(row(["Struttura", "CIN", "ID soggiorno", "Notti tassate", "Imposta (€)"]));
  for (const l of d.lines) {
    out.push(
      row([l.propertyName, l.cin ?? "", l.stayId, String(l.taxedNights), euro(l.amountCents)]),
    );
  }
  out.push(row(["TOTALE", "", "", "", euro(d.totalCents)]));
  if (d.fee && d.fee.takeRateBps > 0) {
    out.push("");
    out.push(
      row([`Servizio Norma (${formatTakeRateBps(d.fee.takeRateBps)})`, euro(d.fee.normaFeeCents)]),
    );
    out.push(row(["Netto da versare al comune", euro(d.fee.comuneNetCents)]));
  }
  return out.join("\r\n");
}
