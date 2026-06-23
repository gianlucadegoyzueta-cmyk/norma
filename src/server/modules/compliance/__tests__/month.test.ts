import { describe, expect, it } from "vitest";
import {
  type MonthComplianceFigures,
  humanMonth,
  monthBounds,
  recentMonths,
  toComplianceRow,
  verdictForMonth,
} from "../domain/month";

function figures(overrides: Partial<MonthComplianceFigures> = {}): MonthComplianceFigures {
  return {
    month: "2026-05",
    schedineExpected: 0,
    schedineAcquired: 0,
    taxDeclarations: 0,
    taxPending: 0,
    ...overrides,
  };
}

describe("verdictForMonth", () => {
  it("nessuna attività → quiet", () => {
    expect(verdictForMonth(figures())).toBe("quiet");
  });

  it("tutte le schedine acquisite e tassa non pendente → regular", () => {
    expect(
      verdictForMonth(figures({ schedineExpected: 4, schedineAcquired: 4, taxDeclarations: 1 })),
    ).toBe("regular");
  });

  it("schedine non tutte acquisite → attention", () => {
    expect(verdictForMonth(figures({ schedineExpected: 4, schedineAcquired: 3 }))).toBe(
      "attention",
    );
  });

  it("dichiarazione tassa in lavorazione → attention", () => {
    expect(
      verdictForMonth(
        figures({ schedineExpected: 2, schedineAcquired: 2, taxDeclarations: 1, taxPending: 1 }),
      ),
    ).toBe("attention");
  });

  it("solo tassa regolare, niente schedine → regular (c'è attività)", () => {
    expect(verdictForMonth(figures({ taxDeclarations: 1 }))).toBe("regular");
  });
});

describe("toComplianceRow", () => {
  it("calcola le schedine mancanti, mai negative", () => {
    expect(
      toComplianceRow(figures({ schedineExpected: 5, schedineAcquired: 2 })).schedineMissing,
    ).toBe(3);
    expect(
      toComplianceRow(figures({ schedineExpected: 2, schedineAcquired: 5 })).schedineMissing,
    ).toBe(0);
  });
});

describe("recentMonths", () => {
  it("ultimi N mesi dal più recente, attraversando l'anno", () => {
    expect(recentMonths(new Date("2026-02-15T00:00:00Z"), 4)).toEqual([
      "2026-02",
      "2026-01",
      "2025-12",
      "2025-11",
    ]);
  });
});

describe("monthBounds", () => {
  it("confini [start, end) in UTC", () => {
    const { start, end } = monthBounds("2026-02");
    expect(start.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-01T00:00:00.000Z");
  });
  it("rifiuta formati non validi", () => {
    expect(() => monthBounds("2026-13")).toThrow();
    expect(() => monthBounds("nope")).toThrow();
  });
});

describe("humanMonth", () => {
  it("italiano leggibile", () => {
    expect(humanMonth("2026-06")).toBe("giugno 2026");
  });
});
