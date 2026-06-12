import { describe, expect, it } from "vitest";
import { previousWeekWindow } from "../domain/week-window";

function iso(d: Date): string {
  return d.toISOString();
}

describe("previousWeekWindow", () => {
  it("eseguito di lunedì copre lun→dom della settimana precedente", () => {
    // Lunedì 8 giugno 2026, 07:00 UTC.
    const w = previousWeekWindow(new Date("2026-06-08T07:00:00Z"));
    expect(iso(w.start)).toBe("2026-06-01T00:00:00.000Z"); // lunedì 1 giu
    expect(iso(w.end)).toBe("2026-06-08T00:00:00.000Z"); // lunedì 8 giu (escluso)
  });

  it("eseguito a metà settimana copre comunque l'ultima settimana intera", () => {
    // Mercoledì 10 giugno 2026.
    const w = previousWeekWindow(new Date("2026-06-10T12:00:00Z"));
    expect(iso(w.start)).toBe("2026-06-01T00:00:00.000Z");
    expect(iso(w.end)).toBe("2026-06-08T00:00:00.000Z");
  });

  it("eseguito di domenica resta nella settimana precedente (no settimane parziali)", () => {
    // Domenica 14 giugno 2026.
    const w = previousWeekWindow(new Date("2026-06-14T23:00:00Z"));
    expect(iso(w.start)).toBe("2026-06-01T00:00:00.000Z");
    expect(iso(w.end)).toBe("2026-06-08T00:00:00.000Z");
  });

  it("la finestra è sempre lunga esattamente 7 giorni", () => {
    const w = previousWeekWindow(new Date("2026-02-03T00:00:00Z"));
    const days = (w.end.getTime() - w.start.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(7);
  });
});
