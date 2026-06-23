import { describe, expect, it } from "vitest";
import {
  assertRealCalendarDay,
  daysOfPeriod,
  InvalidPeriodError,
  parseCalendarDate,
  periodBounds,
  periodLabel,
  periodOf,
  transmissionDeadline,
} from "../period";

describe("period", () => {
  it("periodOf restituisce YYYY-MM in UTC", () => {
    expect(periodOf(new Date("2026-05-20T12:00:00Z"))).toBe("2026-05");
    expect(periodOf(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01");
  });

  it("periodBounds: [1° del mese, 1° del mese successivo)", () => {
    const { start, end } = periodBounds("2026-05");
    expect(start.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("transmissionDeadline: 5 del mese successivo", () => {
    expect(transmissionDeadline("2026-05").toISOString()).toBe("2026-06-05T00:00:00.000Z");
    expect(transmissionDeadline("2026-12").toISOString()).toBe("2027-01-05T00:00:00.000Z");
  });

  it("daysOfPeriod: tutti i giorni del mese", () => {
    expect(daysOfPeriod("2026-05")).toHaveLength(31);
    expect(daysOfPeriod("2026-02")).toHaveLength(28); // 2026 non bisestile
    const giugno = daysOfPeriod("2026-06");
    expect(giugno[0]).toBe("2026-06-01");
    expect(giugno.at(-1)).toBe("2026-06-30");
  });

  it("periodLabel italiano", () => {
    expect(periodLabel("2026-05")).toBe("Maggio 2026");
  });

  it("periodo non valido → errore", () => {
    expect(() => periodBounds("2026-13")).toThrow(InvalidPeriodError);
    expect(() => periodBounds("maggio")).toThrow(InvalidPeriodError);
  });
});

describe("validazione giorno-calendario (A4: mai inventare un giorno inesistente)", () => {
  it("assertRealCalendarDay: giorni reali non lanciano", () => {
    expect(() => assertRealCalendarDay(2024, 2, 29)).not.toThrow(); // 2024 bisestile
    expect(() => assertRealCalendarDay(2026, 1, 31)).not.toThrow();
    expect(() => assertRealCalendarDay(2026, 12, 31)).not.toThrow();
  });

  it("assertRealCalendarDay: 30 febbraio (e altri giorni fantasma) → InvalidPeriodError", () => {
    expect(() => assertRealCalendarDay(2025, 2, 30)).toThrow(InvalidPeriodError);
    expect(() => assertRealCalendarDay(2025, 2, 29)).toThrow(InvalidPeriodError); // 2025 NON bisestile
    expect(() => assertRealCalendarDay(2026, 4, 31)).toThrow(InvalidPeriodError); // aprile ha 30 giorni
    expect(() => assertRealCalendarDay(2026, 0, 1)).toThrow(InvalidPeriodError); // mese 0
    expect(() => assertRealCalendarDay(2026, 13, 1)).toThrow(InvalidPeriodError); // mese 13
  });

  it("parseCalendarDate: round-trip a mezzanotte UTC per un giorno valido", () => {
    expect(parseCalendarDate("2026-02-28").toISOString()).toBe("2026-02-28T00:00:00.000Z");
    expect(parseCalendarDate("2024-02-29").toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });

  it("parseCalendarDate: 2025-02-30 → throw (giorno inesistente, mai roll-over silenzioso)", () => {
    expect(() => parseCalendarDate("2025-02-30")).toThrow(InvalidPeriodError);
  });

  it("parseCalendarDate: formato/range non validi → throw", () => {
    expect(() => parseCalendarDate("2025-13-01")).toThrow(InvalidPeriodError); // mese 13
    expect(() => parseCalendarDate("2025-00-10")).toThrow(InvalidPeriodError); // mese 0
    expect(() => parseCalendarDate("2025-1-1")).toThrow(InvalidPeriodError); // non zero-pad
    expect(() => parseCalendarDate("not-a-date")).toThrow(InvalidPeriodError);
  });
});
