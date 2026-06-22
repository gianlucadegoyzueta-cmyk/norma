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
    return makeUtc(Number(y), Number(m), Number(d), 0, 0, 0);
  }
  // DATE-TIME `YYYYMMDDTHHMMSS` (+ eventuale `Z`). Un eventuale TZID è nei parametri della
  // proprietà (già rimossi da splitProperty): per le prenotazioni conta il giorno civile,
  // quindi l'istante viene trattato come UTC (approssimazione voluta, vedi testata file).
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
  if (dateTime) {
    const [, y, m, d, hh, mm, ss] = dateTime;
    return makeUtc(Number(y), Number(m), Number(d), Number(hh), Number(mm), Number(ss));
  }
  return null;
}

/**
 * Costruisce una Date UTC validando i campi: rifiuta date impossibili (mese 13, giorno 32,
 * 30 febbraio…) che `Date.UTC` accetterebbe silenziosamente con un roll-over, producendo un
 * arrivo sbagliato da un feed corrotto. Ritorna null se i componenti non sono coerenti.
 */
function makeUtc(y: number, m: number, d: number, hh: number, mm: number, ss: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || hh > 23 || mm > 59 || ss > 59) return null;
  const date = new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  // Round-trip: se il roll-over ha cambiato i componenti, l'input era invalido.
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d ||
    date.getUTCHours() !== hh ||
    date.getUTCMinutes() !== mm ||
    date.getUTCSeconds() !== ss
  ) {
    return null;
  }
  return date;
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
 * RESILIENTE per costruzione (i feed reali sono spesso malformati):
 *  - scarta gli eventi senza UID o senza DTSTART valido (non utilizzabili come soggiorno);
 *  - scarta gli eventi `STATUS:CANCELLED` (cancellazioni esplicite RFC 5545): non sono
 *    soggiorni attivi e la riconciliazione li tratta come "spariti dal feed";
 *  - tollera proprietà sconosciute, righe senza ":", `BEGIN:VEVENT` ripetuti senza END e
 *    `END:VEVENT` orfani senza propagare errori (un evento rotto non fa fallire l'import);
 *  - DEDUP per UID: a parità di UID vince l'ultimo evento valido letto (allineato a `reconcile`),
 *    così `total`/`blocked` dell'anteprima non vengono gonfiati dai duplicati.
 * NON applica filtri di dominio (es. "non disponibile"): vedi `isReservationLike`.
 */
export function parseICal(raw: string): ParsedReservation[] {
  // Guard difensiva: input non-stringa o vuoto → nessun evento (niente throw).
  if (typeof raw !== "string" || raw.length === 0) return [];

  const lines = unfoldLines(raw);
  // Dedup per UID. Map preserva l'ordine; per "vince l'ultimo" cancelliamo e re-inseriamo.
  const byUid = new Map<string, ParsedReservation>();

  let inEvent = false;
  let uid: string | null = null;
  let dtStart: Date | null = null;
  let dtEnd: Date | null = null;
  let summary: string | null = null;
  let cancelled = false;

  const reset = (): void => {
    uid = dtStart = dtEnd = summary = null;
    cancelled = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "BEGIN:VEVENT") {
      // BEGIN ripetuto senza END: ricomincia l'evento (scarta lo stato parziale).
      inEvent = true;
      reset();
      continue;
    }
    if (trimmed === "END:VEVENT") {
      // END orfano (senza BEGIN) → inEvent è false: ignora.
      if (inEvent && uid && dtStart) {
        if (cancelled) {
          // "Vince l'ultimo": una cancellazione esplicita rimuove un eventuale duplicato attivo.
          byUid.delete(uid);
        } else {
          // Rimuovi l'eventuale precedente con stesso UID e re-inserisci in coda.
          byUid.delete(uid);
          byUid.set(uid, { uid, arrivalDate: dtStart, departureDate: dtEnd, summary });
        }
      }
      inEvent = false;
      reset();
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
      case "STATUS":
        // RFC 5545: STATUS:CANCELLED → evento annullato, non è un soggiorno attivo.
        if (prop.value.trim().toUpperCase() === "CANCELLED") cancelled = true;
        break;
      default:
        break;
    }
  }

  return Array.from(byUid.values());
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
