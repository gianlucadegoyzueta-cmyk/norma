import { describe, expect, it } from "vitest";
import type { ParsedReservation } from "../domain/ical";
import { buildPreview } from "../domain/preview";

function ev(
  uid: string,
  start: string,
  end: string | null,
  summary: string | null = "Reserved",
): ParsedReservation {
  return {
    uid,
    arrivalDate: new Date(`${start}T00:00:00Z`),
    departureDate: end ? new Date(`${end}T00:00:00Z`) : null,
    summary,
  };
}

describe("buildPreview", () => {
  it("ordina per data di arrivo e calcola le notti", () => {
    const p = buildPreview([
      ev("b", "2026-06-20", "2026-06-22"),
      ev("a", "2026-06-10", "2026-06-15"),
    ]);
    expect(p.total).toBe(2);
    expect(p.reservations.map((r) => r.uid)).toEqual(["a", "b"]);
    expect(p.reservations[0].nights).toBe(5);
    expect(p.reservations[1].nights).toBe(2);
  });

  it("notti null se manca la data di partenza", () => {
    const p = buildPreview([ev("a", "2026-06-10", null)]);
    expect(p.reservations[0].nights).toBeNull();
  });

  it("notti null se la partenza non è dopo l'arrivo", () => {
    const p = buildPreview([ev("a", "2026-06-10", "2026-06-10")]);
    expect(p.reservations[0].nights).toBeNull();
  });

  it("dedup per UID (vince l'ultimo letto), coerente con la riconciliazione", () => {
    const p = buildPreview([
      ev("dup", "2026-06-10", "2026-06-12"),
      ev("dup", "2026-06-11", "2026-06-13"),
    ]);
    expect(p.total).toBe(1);
    expect(p.reservations[0].arrivalDate.toISOString()).toBe("2026-06-11T00:00:00.000Z");
  });

  it("feed vuoto → zero prenotazioni", () => {
    expect(buildPreview([]).total).toBe(0);
  });
});
