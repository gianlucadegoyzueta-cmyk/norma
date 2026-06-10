import type { ReservationSource } from "@prisma/client";

/**
 * Deduce la piattaforma di provenienza dall'URL del feed iCal incollato dall'host.
 * Riconoscimento per hostname (robusto ai path/query che cambiano spesso):
 *  - Airbnb → AIRBNB
 *  - Booking.com → BOOKING
 *  - VRBO / HomeAway → VRBO
 *  - qualsiasi altro calendario RFC5545 → OTHER
 * URL non valido → OTHER (l'errore vero scatta poi al fetch).
 */
export function detectSource(url: string): ReservationSource {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "OTHER";
  }
  if (host.includes("airbnb.")) return "AIRBNB";
  if (host.includes("booking.com")) return "BOOKING";
  if (host.includes("vrbo.") || host.includes("homeaway.")) return "VRBO";
  return "OTHER";
}

/** Etichetta leggibile della sorgente per la UI. */
export function sourceLabel(source: ReservationSource): string {
  switch (source) {
    case "AIRBNB":
      return "Airbnb";
    case "BOOKING":
      return "Booking.com";
    case "VRBO":
      return "VRBO";
    case "OTHER":
      return "Altro calendario";
  }
}

/**
 * Valida che un URL iCal sia plausibile: http/https e host presente. Non garantisce che
 * risponda (quello è compito del fetch), ma blocca subito input palesemente errati.
 */
export function isValidICalUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.length > 0;
  } catch {
    return false;
  }
}
