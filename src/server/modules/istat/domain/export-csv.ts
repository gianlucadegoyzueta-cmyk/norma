// Export CSV del report ISTAT mensile (movimento turistico). PURO: report in → stringa out.
// Separatore ";" (convenzione IT/Excel), righe CRLF. Una riga per provenienza + riga TOTALE.

import type { IstatMonthlyReport } from "./aggregate";

function csvField(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function row(cells: string[]): string {
  return cells.map(csvField).join(";");
}

/** CSV deterministico del report: intestazione periodo, colonne Provenienza/Arrivi/Presenze, totale. */
export function toIstatCsv(report: IstatMonthlyReport): string {
  const out: string[] = [];
  out.push(row(["Periodo", report.period]));
  out.push("");
  out.push(row(["Provenienza", "Arrivi", "Presenze"]));
  for (const r of report.rows) {
    out.push(row([r.label, String(r.arrivi), String(r.presenze)]));
  }
  out.push(row(["TOTALE", String(report.totals.arrivi), String(report.totals.presenze)]));
  return out.join("\r\n");
}
