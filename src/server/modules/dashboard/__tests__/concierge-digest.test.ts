import { describe, expect, it } from "vitest";
import { buildConciergeDigest, occupancyPercent, type ConciergeEvent } from "../concierge-digest";

const ev = (iso: string, partial: Partial<ConciergeEvent> = {}): ConciergeEvent => ({
  at: new Date(iso),
  kind: "ical-sync",
  text: "evento",
  highlight: "x",
  ...partial,
});

describe("buildConciergeDigest", () => {
  const now = new Date("2026-06-11T09:00:00Z");

  it("tiene solo gli eventi dentro la finestra e li ordina dal più vecchio", () => {
    const events = [
      ev("2026-06-11T06:12:00Z", { highlight: "+€18,00" }),
      ev("2026-06-11T03:00:00Z", { highlight: "2 prenotazioni" }),
      ev("2026-06-09T22:00:00Z", { highlight: "vecchio" }), // fuori finestra (24h)
      ev("2026-06-11T06:10:00Z", { highlight: "2 schedine" }),
    ];
    const digest = buildConciergeDigest(events, { now, windowHours: 24 });
    expect(digest.thingsDone).toBe(3);
    expect(digest.rows.map((r) => r.highlight)).toEqual([
      "2 prenotazioni",
      "2 schedine",
      "+€18,00",
    ]);
  });

  it("esclude eventi nel futuro rispetto a now", () => {
    const digest = buildConciergeDigest([ev("2026-06-11T10:00:00Z")], { now, windowHours: 24 });
    expect(digest.thingsDone).toBe(0);
    expect(digest.rows).toEqual([]);
  });

  it("digest vuoto se nessun evento", () => {
    expect(buildConciergeDigest([], { now, windowHours: 24 })).toEqual({
      thingsDone: 0,
      rows: [],
    });
  });
});

describe("occupancyPercent", () => {
  const monthStart = new Date("2026-06-01T00:00:00Z");
  const monthEnd = new Date("2026-07-01T00:00:00Z"); // giugno: 30 notti

  it("0 se non ci sono immobili", () => {
    expect(
      occupancyPercent([{ arrivalDate: monthStart, departureDate: monthEnd }], {
        monthStart,
        monthEnd,
        propertyCount: 0,
      }),
    ).toBe(0);
  });

  it("calcola la percentuale sulle notti del mese per immobile", () => {
    // 15 notti occupate su 1 immobile × 30 notti = 50%
    const stays = [
      {
        arrivalDate: new Date("2026-06-05T00:00:00Z"),
        departureDate: new Date("2026-06-20T00:00:00Z"),
      },
    ];
    expect(occupancyPercent(stays, { monthStart, monthEnd, propertyCount: 1 })).toBe(50);
  });

  it("conta solo l'intersezione col mese e non supera 100", () => {
    const stays = [
      // sconfina nei mesi adiacenti: contano solo le notti di giugno (30)
      {
        arrivalDate: new Date("2026-05-20T00:00:00Z"),
        departureDate: new Date("2026-07-10T00:00:00Z"),
      },
    ];
    expect(occupancyPercent(stays, { monthStart, monthEnd, propertyCount: 1 })).toBe(100);
  });

  it("un soggiorno senza partenza conta una notte", () => {
    const stays = [{ arrivalDate: new Date("2026-06-10T00:00:00Z"), departureDate: null }];
    // 1 notte / (2 immobili × 30) = 1.67% → 2%
    expect(occupancyPercent(stays, { monthStart, monthEnd, propertyCount: 2 })).toBe(2);
  });
});
