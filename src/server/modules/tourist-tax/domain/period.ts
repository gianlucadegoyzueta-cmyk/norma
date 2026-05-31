// Gestione dei PERIODI di dichiarazione. PURA. Tutto in UTC per evitare derive di fuso.
//   MONTHLY   → "2026-05"
//   QUARTERLY → "2026-Q2"
//   ANNUAL    → "2026"
// periodBounds ritorna [start, end) con end ESCLUSIVO.

import type { DeclarationPeriod } from "./rule";

export function periodOf(date: Date, period: DeclarationPeriod): string {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth(); // 0..11
  switch (period) {
    case "MONTHLY":
      return `${y}-${String(m + 1).padStart(2, "0")}`;
    case "QUARTERLY":
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    case "ANNUAL":
      return `${y}`;
  }
}

export class InvalidPeriodError extends Error {
  constructor(value: string) {
    super(`Periodo non valido: "${value}"`);
    this.name = "InvalidPeriodError";
  }
}

/** [start, end) in UTC della finestra coperta dalla stringa di periodo. end esclusivo. */
export function periodBounds(periodStr: string): { start: Date; end: Date } {
  const monthly = /^(\d{4})-(\d{2})$/.exec(periodStr);
  if (monthly) {
    const y = Number(monthly[1]);
    const m = Number(monthly[2]);
    if (m < 1 || m > 12) throw new InvalidPeriodError(periodStr);
    return { start: utc(y, m - 1, 1), end: utc(y, m, 1) };
  }
  const quarterly = /^(\d{4})-Q([1-4])$/.exec(periodStr);
  if (quarterly) {
    const y = Number(quarterly[1]);
    const q = Number(quarterly[2]);
    return { start: utc(y, (q - 1) * 3, 1), end: utc(y, q * 3, 1) };
  }
  const annual = /^(\d{4})$/.exec(periodStr);
  if (annual) {
    const y = Number(annual[1]);
    return { start: utc(y, 0, 1), end: utc(y + 1, 0, 1) };
  }
  throw new InvalidPeriodError(periodStr);
}

/** Etichetta leggibile in italiano. */
export function periodLabel(periodStr: string): string {
  const monthly = /^(\d{4})-(\d{2})$/.exec(periodStr);
  if (monthly) {
    const mesi = [
      "Gennaio",
      "Febbraio",
      "Marzo",
      "Aprile",
      "Maggio",
      "Giugno",
      "Luglio",
      "Agosto",
      "Settembre",
      "Ottobre",
      "Novembre",
      "Dicembre",
    ];
    return `${mesi[Number(monthly[2]) - 1]} ${monthly[1]}`;
  }
  const quarterly = /^(\d{4})-Q([1-4])$/.exec(periodStr);
  if (quarterly) return `${quarterly[2]}º trimestre ${quarterly[1]}`;
  const annual = /^(\d{4})$/.exec(periodStr);
  if (annual) return `Anno ${annual[1]}`;
  throw new InvalidPeriodError(periodStr);
}

function utc(y: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(y, monthIndex, day));
}
