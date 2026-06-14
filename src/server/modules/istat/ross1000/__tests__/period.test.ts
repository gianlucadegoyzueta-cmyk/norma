import { describe, expect, it } from "vitest";
import {
  daysOfPeriod,
  InvalidPeriodError,
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
