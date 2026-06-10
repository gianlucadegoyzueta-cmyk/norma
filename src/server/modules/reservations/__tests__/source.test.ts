import { describe, expect, it } from "vitest";
import { detectSource, isValidICalUrl, sourceLabel } from "../domain/source";

describe("detectSource", () => {
  it("riconosce Airbnb", () => {
    expect(detectSource("https://www.airbnb.com/calendar/ical/123.ics?s=abc")).toBe("AIRBNB");
    expect(detectSource("https://www.airbnb.it/calendar/ical/123.ics")).toBe("AIRBNB");
  });
  it("riconosce Booking.com", () => {
    expect(detectSource("https://admin.booking.com/hotel/hoteladmin/ical.html?t=xyz")).toBe(
      "BOOKING",
    );
  });
  it("riconosce VRBO / HomeAway", () => {
    expect(detectSource("https://www.vrbo.com/icalendar/abc.ics")).toBe("VRBO");
    expect(detectSource("https://www.homeaway.com/icalendar/abc.ics")).toBe("VRBO");
  });
  it("fallback OTHER per host sconosciuti o URL non valido", () => {
    expect(detectSource("https://example.com/cal.ics")).toBe("OTHER");
    expect(detectSource("non-un-url")).toBe("OTHER");
  });
});

describe("isValidICalUrl", () => {
  it("accetta http/https con host", () => {
    expect(isValidICalUrl("https://airbnb.com/x.ics")).toBe(true);
    expect(isValidICalUrl("http://example.com/x")).toBe(true);
  });
  it("rifiuta schemi diversi e stringhe non-URL", () => {
    expect(isValidICalUrl("ftp://example.com/x")).toBe(false);
    expect(isValidICalUrl("webcal://example.com/x")).toBe(false);
    expect(isValidICalUrl("solo testo")).toBe(false);
    expect(isValidICalUrl("")).toBe(false);
  });
});

describe("sourceLabel", () => {
  it("etichette leggibili", () => {
    expect(sourceLabel("AIRBNB")).toBe("Airbnb");
    expect(sourceLabel("BOOKING")).toBe("Booking.com");
    expect(sourceLabel("OTHER")).toBe("Altro calendario");
  });
});
