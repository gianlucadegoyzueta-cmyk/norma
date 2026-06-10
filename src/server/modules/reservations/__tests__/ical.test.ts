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
