// PERIODO del report Ross1000. PURA, tutto in UTC. Ross1000 è MENSILE: "YYYY-MM".
// La scadenza di trasmissione è il 5 del mese successivo (regola operativa, vedi docs).

export class InvalidPeriodError extends Error {
  constructor(value: string) {
    super(`Periodo non valido (atteso "YYYY-MM"): "${value}"`);
    this.name = "InvalidPeriodError";
  }
}

const MESI = [
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

function parse(periodStr: string): { y: number; m: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(periodStr);
  if (!m) throw new InvalidPeriodError(periodStr);
  const month = Number(m[2]);
  if (month < 1 || month > 12) throw new InvalidPeriodError(periodStr);
  return { y: Number(m[1]), m: month };
}

/**
 * Verifica che (anno, mese 1-based, giorno) sia un giorno-calendario REALE con round-trip UTC.
 * Una data "fantasma" (es. 30 febbraio) rotola al mese successivo, quindi `getUTCDate()` non
 * torna `day`. "Mai inventare dati": un giorno inesistente è un errore, non lo si normalizza
 * in silenzio. Lancia `InvalidPeriodError` se il giorno non esiste.
 */
export function assertRealCalendarDay(year: number, month1: number, day: number): void {
  const probe = new Date(Date.UTC(year, month1 - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month1 - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new InvalidPeriodError(
      `${year}-${String(month1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    );
  }
}

/**
 * Parsa una data "YYYY-MM-DD" rifiutando i giorni inesistenti (es. "2025-02-30", "2025-13-01").
 * Ritorna mezzanotte UTC del giorno. Lancia `InvalidPeriodError` su formato o giorno non reale.
 */
export function parseCalendarDate(dateStr: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!m) throw new InvalidPeriodError(dateStr);
  const year = Number(m[1]);
  const month1 = Number(m[2]);
  const day = Number(m[3]);
  if (month1 < 1 || month1 > 12) throw new InvalidPeriodError(dateStr);
  assertRealCalendarDay(year, month1, day);
  return new Date(Date.UTC(year, month1 - 1, day));
}

/** Periodo "YYYY-MM" che contiene una data. */
export function periodOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** [start, end) in UTC del mese. end esclusivo (1° del mese successivo). */
export function periodBounds(periodStr: string): { start: Date; end: Date } {
  const { y, m } = parse(periodStr);
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

/** Scadenza di trasmissione: 5 del mese successivo (UTC, inizio giornata). */
export function transmissionDeadline(periodStr: string): Date {
  const { y, m } = parse(periodStr);
  return new Date(Date.UTC(y, m, 5)); // m (0-based del mese successivo) giorno 5
}

/** Etichetta leggibile: "Maggio 2026". */
export function periodLabel(periodStr: string): string {
  const { y, m } = parse(periodStr);
  return `${MESI[m - 1]} ${y}`;
}

/** Tutti i giorni del mese in ISO "YYYY-MM-DD", in ordine (per i movimenti zero/struttura). */
export function daysOfPeriod(periodStr: string): string[] {
  const { start, end } = periodBounds(periodStr);
  const days: string[] = [];
  for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}
