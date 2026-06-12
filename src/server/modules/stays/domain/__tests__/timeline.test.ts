import { describe, expect, it } from "vitest";
import { buildStayTimeline, type StayTimelineInput } from "../timeline";

const base: StayTimelineInput = {
  stay: { createdAt: new Date("2026-05-01T10:00:00Z"), importSource: null },
  checkins: [],
  schedine: [],
  tax: [],
};

describe("buildStayTimeline", () => {
  it("soggiorno creato a mano → evento 'created' (non di Norma)", () => {
    const t = buildStayTimeline(base);
    expect(t).toHaveLength(1);
    expect(t[0].kind).toBe("created");
    expect(t[0].byNorma).toBe(false);
  });

  it("soggiorno importato da iCal → evento 'imported' di Norma con sorgente", () => {
    const t = buildStayTimeline({
      ...base,
      stay: { createdAt: base.stay.createdAt, importSource: "AIRBNB" },
    });
    expect(t[0].kind).toBe("imported");
    expect(t[0].byNorma).toBe(true);
    expect(t[0].source).toBe("AIRBNB");
  });

  it("aggrega le schedine per traguardo e conta gli ospiti", () => {
    const t = buildStayTimeline({
      ...base,
      schedine: [
        {
          createdAt: new Date("2026-05-02T08:00:00Z"),
          sentAt: new Date("2026-05-02T09:00:00Z"),
          acquiredAt: new Date("2026-05-03T07:00:00Z"),
          receiptRef: "2026/398755 [RM]",
        },
        {
          createdAt: new Date("2026-05-02T08:05:00Z"),
          sentAt: new Date("2026-05-02T09:05:00Z"),
          acquiredAt: null, // una non ancora acquisita
          receiptRef: null,
        },
      ],
    });
    const kinds = t.map((e) => e.kind);
    expect(kinds).toEqual(["created", "schedina_prepared", "schedina_sent", "schedina_acquired"]);
    const prepared = t.find((e) => e.kind === "schedina_prepared")!;
    expect(prepared.count).toBe(2);
    expect(prepared.at.toISOString()).toBe("2026-05-02T08:00:00.000Z"); // il più presto
    const acquired = t.find((e) => e.kind === "schedina_acquired")!;
    expect(acquired.count).toBe(1);
    expect(acquired.receiptRef).toBe("2026/398755 [RM]");
  });

  it("nessuna schedina inviata/acquisita → solo 'schedina_prepared'", () => {
    const t = buildStayTimeline({
      ...base,
      schedine: [
        {
          createdAt: new Date("2026-05-02T08:00:00Z"),
          sentAt: null,
          acquiredAt: null,
          receiptRef: null,
        },
      ],
    });
    expect(t.map((e) => e.kind)).toEqual(["created", "schedina_prepared"]);
  });

  it("usa il primo check-in completato e ignora i token non completati", () => {
    const t = buildStayTimeline({
      ...base,
      checkins: [
        { completedAt: new Date("2026-05-02T12:00:00Z") },
        { completedAt: new Date("2026-05-01T18:00:00Z") },
      ],
    });
    const checkin = t.find((e) => e.kind === "checkin")!;
    expect(checkin.byNorma).toBe(false);
    expect(checkin.at.toISOString()).toBe("2026-05-01T18:00:00.000Z");
  });

  it("tassa conteggiata e inviata → due eventi con importo e periodo", () => {
    const t = buildStayTimeline({
      ...base,
      tax: [
        {
          amountCents: 600,
          countedAt: new Date("2026-06-01T10:00:00Z"),
          periodLabel: "2026-05",
          submittedAt: new Date("2026-06-05T10:00:00Z"),
        },
      ],
    });
    const counted = t.find((e) => e.kind === "tax_counted")!;
    expect(counted.amountCents).toBe(600);
    expect(counted.periodLabel).toBe("2026-05");
    expect(t.some((e) => e.kind === "tax_submitted")).toBe(true);
  });

  it("ordina cronologicamente tutti gli eventi", () => {
    const t = buildStayTimeline({
      stay: { createdAt: new Date("2026-05-01T10:00:00Z"), importSource: "BOOKING" },
      checkins: [{ completedAt: new Date("2026-05-02T09:00:00Z") }],
      schedine: [
        {
          createdAt: new Date("2026-05-02T10:00:00Z"),
          sentAt: new Date("2026-05-02T11:00:00Z"),
          acquiredAt: new Date("2026-05-03T08:00:00Z"),
          receiptRef: "X",
        },
      ],
      tax: [
        {
          amountCents: 200,
          countedAt: new Date("2026-06-01T10:00:00Z"),
          periodLabel: "2026-05",
          submittedAt: null,
        },
      ],
    });
    const times = t.map((e) => e.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(t[0].kind).toBe("imported");
    expect(t.at(-1)!.kind).toBe("tax_counted");
  });
});
