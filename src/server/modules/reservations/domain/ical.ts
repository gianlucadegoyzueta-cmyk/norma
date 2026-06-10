// Parser RFC 5545 (iCalendar) MINIMALE, puro e senza dipendenze.
//
// Perché scritto a mano e non `node-ical`: i feed di Airbnb/Booking/VRBO sono VEVENT
// non-ricorrenti e piatti (UID, DTSTART, DTEND, SUMMARY, DESCRIPTION). Ci serve solo
// questo. Una libreria con `rrule`/`moment-timezone` aggiungerebbe peso (e timezone DB)
// inutili su un runtime serverless (Vercel). Qui niente RRULE, niente fuso: le date di
// prenotazione sono VALUE=DATE (giorno civile), che trattiamo come mezzanotte UTC.

/** Un VEVENT ridotto a ciò che serve a Norma per creare un Soggiorno. */
export interface ParsedReservation {
  /** UID dell'evento (chiave di dedup). Eventi senza UID vengono scartati. */
  uid: string;
  /** Data di arrivo (DTSTART). Per i feed di prenotazione è il giorno di check-in. */
  arrivalDate: Date;
  /** Data di partenza (DTEND). Nei feed iCal il DTEND è il giorno di check-out (esclusivo). */
  departureDate: Date | null;
  /** SUMMARY (es. "Reserved", "CLOSED - Not available", nome ospite). */
  summary: string | null;
}

/**
 * Srotola le righe "folded" di RFC 5545: una riga continua se la successiva inizia con
 * uno spazio o un TAB. Normalizza prima i fine-riga (CRLF/CR → LF).
 */
function unfoldLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const out: string[] = [];
  for (const line of normalized.split("\n")) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** Decodifica gli escape di un valore TEXT iCal: \n \, \; \\. */
function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Interpreta un valore di data iCal in `Date` (UTC).
 *  - DATE: `YYYYMMDD` → mezzanotte UTC di quel giorno.
 *  - DATE-TIME: `YYYYMMDDTHHMMSS` (+ eventuale `Z`) → istante UTC. Eventuali TZID sono
 *    ignorati (approssimazione voluta: per le prenotazioni conta il giorno civile).
 * Ritorna null se il valore non è riconoscibile.
 */
function parseICalDate(value: string): Date | null {
  const v = value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
  if (dateTime) {
    const [, y, m, d, hh, mm, ss] = dateTime;
    return new Date(
      Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)),
    );
  }
  return null;
}

/** Spezza una riga "NAME;param=x:value" in nome (maiuscolo) e valore grezzo. */
function splitProperty(line: string): { name: string; value: string } | null {
  const colon = line.indexOf(":");
  if (colon === -1) return null;
  const left = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const name = left.split(";")[0].toUpperCase();
  return { name, value };
}

/**
 * Estrae i VEVENT da un testo iCal e li riduce a `ParsedReservation`.
 * Scarta gli eventi senza UID o senza DTSTART valido (non utilizzabili come soggiorno).
 * NON applica filtri di dominio (es. "non disponibile"): vedi `isReservationLike`.
 */
export function parseICal(raw: string): ParsedReservation[] {
  const lines = unfoldLines(raw);
  const out: ParsedReservation[] = [];

  let inEvent = false;
  let uid: string | null = null;
  let dtStart: Date | null = null;
  let dtEnd: Date | null = null;
  let summary: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      inEvent = true;
      uid = dtStart = dtEnd = summary = null;
      continue;
    }
    if (trimmed === "END:VEVENT") {
      if (uid && dtStart) {
        out.push({ uid, arrivalDate: dtStart, departureDate: dtEnd, summary });
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const prop = splitProperty(line);
    if (!prop) continue;
    switch (prop.name) {
      case "UID":
        uid = prop.value.trim() || null;
        break;
      case "DTSTART":
        dtStart = parseICalDate(prop.value);
        break;
      case "DTEND":
        dtEnd = parseICalDate(prop.value);
        break;
      case "SUMMARY":
        summary = unescapeText(prop.value.trim()) || null;
        break;
      default:
        break;
    }
  }

  return out;
}

/**
 * Heuristica: un evento è una PRENOTAZIONE (e non un blocco "date non disponibili").
 * Airbnb/Booking espongono nei feed anche periodi bloccati con SUMMARY tipo
 * "Not available" / "CLOSED - Not available" / "Blocked": NON sono soggiorni e non
 * devono diventare schedine. Senza SUMMARY assumiamo prenotazione (meglio un falso
 * positivo correggibile a mano che perdere un arrivo reale).
 */
export function isReservationLike(summary: string | null): boolean {
  if (!summary) return true;
  return !/(not available|unavailable|blocked|closed)/i.test(summary);
}

/** parseICal + filtro `isReservationLike`: le sole prenotazioni "vere" da importare. */
export function parseReservations(raw: string): ParsedReservation[] {
  return parseICal(raw).filter((e) => isReservationLike(e.summary));
}
