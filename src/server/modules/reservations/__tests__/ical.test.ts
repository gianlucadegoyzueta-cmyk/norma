import { describe, expect, it } from "vitest";
import { isReservationLike, parseICal, parseReservations } from "../domain/ical";

// Feed iCal di esempio nello stile Airbnb (VALUE=DATE, righe folded, escape nel SUMMARY).
const AIRBNB_FEED = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
  "VERSION:2.0",
  "CALSCALE:GREGORIAN",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20260615",
  "DTSTART;VALUE=DATE:20260610",
  "UID:abc123@airbnb.com",
  "SUMMARY:Reserved",
  "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/de",
  " tails/HMABC123",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTEND;VALUE=DATE:20260620",
  "DTSTART;VALUE=DATE:20260618",
  "UID:def456@airbnb.com",
  "SUMMARY:Airbnb (Not available)",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseICal", () => {
  it("estrae i VEVENT con UID e date", () => {
    const events = parseICal(AIRBNB_FEED);
    expect(events).toHaveLength(2);
    const first = events[0];
    expect(first.uid).toBe("abc123@airbnb.com");
    expect(first.arrivalDate.toISOString()).toBe("2026-06-10T00:00:00.000Z");
    expect(first.departureDate?.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(first.summary).toBe("Reserved");
  });

  it("srotola le righe folded (continuazione con spazio)", () => {
    // La DESCRIPTION non viene esposta, ma l'unfolding non deve rompere il parsing dell'evento.
    const events = parseICal(AIRBNB_FEED);
    expect(events[0].uid).toBe("abc123@airbnb.com");
  });

  it("scarta gli eventi senza UID o senza DTSTART", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20260601",
      "SUMMARY:Senza UID",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:nostart@x",
      "SUMMARY:Senza DTSTART",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    expect(parseICal(feed)).toHaveLength(0);
  });

  it("interpreta DATE-TIME con Z come istante UTC", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:dt@x",
      "DTSTART:20260601T140000Z",
      "DTEND:20260603T100000Z",
      "SUMMARY:Reserved",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    const [e] = parseICal(feed);
    expect(e.arrivalDate.toISOString()).toBe("2026-06-01T14:00:00.000Z");
    expect(e.departureDate?.toISOString()).toBe("2026-06-03T10:00:00.000Z");
  });

  it("decodifica gli escape del SUMMARY (\\, \\; \\n)", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:esc@x",
      "DTSTART;VALUE=DATE:20260601",
      "SUMMARY:Rossi\\, Mario\\; nota",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    expect(parseICal(feed)[0].summary).toBe("Rossi, Mario; nota");
  });

  it("gestisce DTEND mancante (departureDate = null)", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:nodtend@x",
      "DTSTART;VALUE=DATE:20260601",
      "SUMMARY:Reserved",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    expect(parseICal(feed)[0].departureDate).toBeNull();
  });
});

describe("parseICal — resilienza e sicurezza del parsing", () => {
  it("scarta gli eventi STATUS:CANCELLED (cancellazione esplicita RFC 5545)", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:live@x",
      "DTSTART;VALUE=DATE:20260601",
      "SUMMARY:Reserved",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:dead@x",
      "DTSTART;VALUE=DATE:20260605",
      "STATUS:CANCELLED",
      "SUMMARY:Reserved",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    const events = parseICal(feed);
    expect(events).toHaveLength(1);
    expect(events[0].uid).toBe("live@x");
  });

  it("dedup per UID: a parità di UID vince l'ultimo evento valido letto", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:dup@x",
      "DTSTART;VALUE=DATE:20260601",
      "DTEND;VALUE=DATE:20260603",
      "SUMMARY:Vecchia",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:dup@x",
      "DTSTART;VALUE=DATE:20260610",
      "DTEND;VALUE=DATE:20260612",
      "SUMMARY:Aggiornata",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    const events = parseICal(feed);
    expect(events).toHaveLength(1);
    expect(events[0].summary).toBe("Aggiornata");
    expect(events[0].arrivalDate.toISOString()).toBe("2026-06-10T00:00:00.000Z");
  });

  it("una cancellazione successiva rimuove un duplicato attivo con lo stesso UID", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:flip@x",
      "DTSTART;VALUE=DATE:20260601",
      "SUMMARY:Reserved",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:flip@x",
      "DTSTART;VALUE=DATE:20260601",
      "STATUS:CANCELLED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    expect(parseICal(feed)).toHaveLength(0);
  });

  it("non lancia su ICS malformato e salta gli eventi invalidi (END orfano, BEGIN annidato)", () => {
    const feed = [
      "spazzatura senza due punti",
      "END:VEVENT", // END orfano: ignorato
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:a@x",
      "DTSTART;VALUE=DATE:20260601",
      "BEGIN:VEVENT", // BEGIN annidato: ricomincia, scarta lo stato parziale precedente
      "UID:b@x",
      "DTSTART;VALUE=DATE:20260701",
      "SUMMARY:Reserved",
      "END:VEVENT",
      "riga: con due punti ma fuori da un evento",
      "END:VCALENDAR",
    ].join("\n");
    let events: ReturnType<typeof parseICal> = [];
    expect(() => {
      events = parseICal(feed);
    }).not.toThrow();
    // L'evento "a@x" è stato troncato dal BEGIN annidato; resta solo "b@x".
    expect(events.map((e) => e.uid)).toEqual(["b@x"]);
  });

  it("rifiuta date impossibili (mese 13, giorno 32) invece di farle rollare", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:bad-month@x",
      "DTSTART;VALUE=DATE:20261301",
      "SUMMARY:Reserved",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:bad-day@x",
      "DTSTART;VALUE=DATE:20260632",
      "SUMMARY:Reserved",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    // DTSTART non parsabile → evento scartato (niente data sbagliata in DB).
    expect(parseICal(feed)).toHaveLength(0);
  });

  it("non lancia su input vuoto o non-stringa", () => {
    expect(parseICal("")).toEqual([]);
    // @ts-expect-error verifica difensiva runtime su input non valido
    expect(parseICal(undefined)).toEqual([]);
    // @ts-expect-error verifica difensiva runtime su input non valido
    expect(parseICal(null)).toEqual([]);
  });

  it("tollera DTSTART con TZID (lo tratta come istante UTC, approssimazione voluta)", () => {
    const feed = [
      "BEGIN:VCALENDAR",
      "BEGIN:VEVENT",
      "UID:tz@x",
      "DTSTART;TZID=Europe/Rome:20260601T140000",
      "DTEND;TZID=Europe/Rome:20260603T100000",
      "SUMMARY:Reserved",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    const [e] = parseICal(feed);
    expect(e.arrivalDate.toISOString()).toBe("2026-06-01T14:00:00.000Z");
    expect(e.departureDate?.toISOString()).toBe("2026-06-03T10:00:00.000Z");
  });
});

describe("isReservationLike", () => {
  it("riconosce i blocchi 'non disponibile' come NON prenotazioni", () => {
    expect(isReservationLike("Airbnb (Not available)")).toBe(false);
    expect(isReservationLike("CLOSED - Not available")).toBe(false);
    expect(isReservationLike("Blocked")).toBe(false);
  });

  it("tratta le prenotazioni vere (e i SUMMARY assenti) come prenotazioni", () => {
    expect(isReservationLike("Reserved")).toBe(true);
    expect(isReservationLike("Mario Rossi")).toBe(true);
    expect(isReservationLike(null)).toBe(true);
  });
});

describe("parseReservations", () => {
  it("filtra via i blocchi di indisponibilità", () => {
    const reservations = parseReservations(AIRBNB_FEED);
    expect(reservations).toHaveLength(1);
    expect(reservations[0].uid).toBe("abc123@airbnb.com");
  });
});
