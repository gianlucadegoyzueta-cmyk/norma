import { describe, expect, it } from "vitest";
import { InvalidPeriodError, periodBounds, periodLabel, periodOf } from "../domain/period";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("periodOf", () => {
  it("mensile/trimestrale/annuale", () => {
    expect(periodOf(d("2026-05-10"), "MONTHLY")).toBe("2026-05");
    expect(periodOf(d("2026-05-10"), "QUARTERLY")).toBe("2026-Q2");
    expect(periodOf(d("2026-05-10"), "ANNUAL")).toBe("2026");
  });
});

describe("periodBounds — finestre [start, end)", () => {
  it("mensile", () => {
    const b = periodBounds("2026-05");
    expect(b.start.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(b.end.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("trimestrale", () => {
    const b = periodBounds("2026-Q2");
    expect(b.start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(b.end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("annuale", () => {
    const b = periodBounds("2026");
    expect(b.start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(b.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

// A4: round-trip robusto su anni bisestili. Febbraio bisestile (2024, 29 giorni) e non bisestile
// (2025, 28 giorni) devono produrre confini corretti, e una data 29-feb deve cadere dentro la
// finestra del proprio mese (e fuori dal mese successivo).
describe("A4 — leap day round-trip", () => {
  it("febbraio 2024 (bisestile): end = 1 marzo, il 29-feb è dentro la finestra", () => {
    const b = periodBounds("2024-02");
    expect(b.start.toISOString()).toBe("2024-02-01T00:00:00.000Z");
    expect(b.end.toISOString()).toBe("2024-03-01T00:00:00.000Z");
    const leap = d("2024-02-29");
    expect(leap.getTime()).toBeGreaterThanOrEqual(b.start.getTime());
    expect(leap.getTime()).toBeLessThan(b.end.getTime());
  });

  it("febbraio 2025 (non bisestile): end = 1 marzo, il 28-feb è dentro la finestra", () => {
    const b = periodBounds("2025-02");
    expect(b.start.toISOString()).toBe("2025-02-01T00:00:00.000Z");
    expect(b.end.toISOString()).toBe("2025-03-01T00:00:00.000Z");
    const last = d("2025-02-28");
    expect(last.getTime()).toBeLessThan(b.end.getTime());
  });

  it("round-trip: periodOf(start, period) ricostruisce la stringa di periodo", () => {
    for (const p of ["2024-02", "2025-02", "2026-12", "2024-Q1", "2024"]) {
      const b = periodBounds(p);
      // I confini start cadono sempre sul 1° del mese giusto (proprietà che l'assert interno garantisce).
      expect(b.start.getUTCDate()).toBe(1);
    }
    expect(periodOf(periodBounds("2024-02").start, "MONTHLY")).toBe("2024-02");
    expect(periodOf(periodBounds("2024-Q1").start, "QUARTERLY")).toBe("2024-Q1");
    expect(periodOf(periodBounds("2024").start, "ANNUAL")).toBe("2024");
  });
});

describe("periodBounds — input non validi", () => {
  it("mese 00 o 13 → InvalidPeriodError", () => {
    expect(() => periodBounds("2026-00")).toThrow(InvalidPeriodError);
    expect(() => periodBounds("2026-13")).toThrow(InvalidPeriodError);
  });

  it("formato sconosciuto → InvalidPeriodError", () => {
    expect(() => periodBounds("2026-5")).toThrow(InvalidPeriodError);
    expect(() => periodBounds("nope")).toThrow(InvalidPeriodError);
    expect(() => periodBounds("2026-Q5")).toThrow(InvalidPeriodError);
  });
});

describe("periodLabel", () => {
  it("etichette leggibili", () => {
    expect(periodLabel("2026-02")).toBe("Febbraio 2026");
    expect(periodLabel("2026-Q2")).toBe("2º trimestre 2026");
    expect(periodLabel("2026")).toBe("Anno 2026");
  });
});
