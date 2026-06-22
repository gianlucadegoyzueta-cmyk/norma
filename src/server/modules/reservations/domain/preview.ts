import type { ParsedReservation } from "./ical";

// ANTEPRIMA dell'import iCal: pura, senza I/O. Trasforma le prenotazioni lette dal feed
// in righe pronte da mostrare PRIMA dell'import (date, notti). Dedup per UID coerente con
// la riconciliazione (vedi domain/reconcile): così il numero in anteprima == quanto verrà
// effettivamente importato.

const MS_PER_DAY = 86_400_000;

/** Una prenotazione del feed, ridotta a ciò che serve all'anteprima in UI. */
export interface PreviewReservation {
  uid: string;
  arrivalDate: Date;
  departureDate: Date | null;
  /** Notti = giorni tra partenza e arrivo; null se manca la partenza o non è coerente. */
  nights: number | null;
  summary: string | null;
}

export interface ReservationPreview {
  /** Prenotazioni distinte (dedup per UID), ordinate per data di arrivo. */
  reservations: PreviewReservation[];
  /** Numero di prenotazioni distinte (== reservations.length). */
  total: number;
}

/** Numero di notti tra arrivo e partenza (date = mezzanotte UTC). null se non calcolabile. */
function nightsBetween(arrival: Date, departure: Date | null): number | null {
  if (!departure) return null;
  const diff = Math.round((departure.getTime() - arrival.getTime()) / MS_PER_DAY);
  return diff > 0 ? diff : null;
}

/**
 * Costruisce l'anteprima dalle prenotazioni già filtrate (vedi `parseReservations`).
 * Dedup per UID (vince l'ultimo letto, come la riconciliazione) e ordinamento per arrivo.
 */
export function buildPreview(parsed: ParsedReservation[]): ReservationPreview {
  const byUid = new Map<string, ParsedReservation>();
  for (const ev of parsed) byUid.set(ev.uid, ev);

  const reservations = [...byUid.values()]
    .map((ev) => ({
      uid: ev.uid,
      arrivalDate: ev.arrivalDate,
      departureDate: ev.departureDate,
      nights: nightsBetween(ev.arrivalDate, ev.departureDate),
      summary: ev.summary,
    }))
    .sort(
      (a, b) => a.arrivalDate.getTime() - b.arrivalDate.getTime() || a.uid.localeCompare(b.uid),
    );

  return { reservations, total: reservations.length };
}
