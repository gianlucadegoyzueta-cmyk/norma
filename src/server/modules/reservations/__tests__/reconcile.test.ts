import { describe, expect, it } from "vitest";
import type { ParsedReservation } from "../domain/ical";
import { type ExistingImportedStay, reconcile } from "../domain/reconcile";

function ev(uid: string, start: string, end: string | null): ParsedReservation {
  return {
    uid,
    arrivalDate: new Date(start),
    departureDate: end ? new Date(end) : null,
    summary: "Reserved",
  };
}

function existing(
  over: Partial<ExistingImportedStay> & { id: string; icalUid: string },
): ExistingImportedStay {
  return {
    importStatus: "DRAFT",
    hasGuests: false,
    arrivalDate: new Date("2026-06-10T00:00:00Z"),
    departureDate: new Date("2026-06-15T00:00:00Z"),
    ...over,
  };
}

describe("reconcile", () => {
  it("crea i soggiorni per i nuovi UID", () => {
    const plan = reconcile([ev("a", "2026-06-10T00:00:00Z", "2026-06-15T00:00:00Z")], []);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].icalUid).toBe("a");
    expect(plan.seen).toBe(1);
  });

  it("idempotente: stesso feed, stessi dati → nessuna azione", () => {
    const parsed = [ev("a", "2026-06-10T00:00:00Z", "2026-06-15T00:00:00Z")];
    const existingStays = [existing({ id: "s1", icalUid: "a" })];
    const plan = reconcile(parsed, existingStays);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.toCancel).toHaveLength(0);
  });

  it("aggiorna le date se cambiate nel feed", () => {
    const parsed = [ev("a", "2026-06-11T00:00:00Z", "2026-06-16T00:00:00Z")];
    const existingStays = [existing({ id: "s1", icalUid: "a" })];
    const plan = reconcile(parsed, existingStays);
    expect(plan.toUpdate).toHaveLength(1);
    expect(plan.toUpdate[0]).toMatchObject({
      stayId: "s1",
      importStatus: "DRAFT",
    });
    expect(plan.toUpdate[0].arrivalDate.toISOString()).toBe("2026-06-11T00:00:00.000Z");
  });

  it("evento sparito + soggiorno ancora bozza (no ospiti) → CANCELLED", () => {
    const existingStays = [existing({ id: "s1", icalUid: "a", hasGuests: false })];
    const plan = reconcile([], existingStays);
    expect(plan.toCancel).toEqual([{ stayId: "s1", importStatus: "CANCELLED" }]);
  });

  it("evento sparito + soggiorno arricchito (ospiti) → NEEDS_CANCEL_REVIEW, non si tocca", () => {
    const existingStays = [existing({ id: "s1", icalUid: "a", hasGuests: true })];
    const plan = reconcile([], existingStays);
    expect(plan.toCancel).toEqual([{ stayId: "s1", importStatus: "NEEDS_CANCEL_REVIEW" }]);
  });

  it("evento già CANCELLED che resta assente → nessuna nuova azione (idempotente)", () => {
    const existingStays = [existing({ id: "s1", icalUid: "a", importStatus: "CANCELLED" })];
    const plan = reconcile([], existingStays);
    expect(plan.toCancel).toHaveLength(0);
  });

  it("evento ricomparso dopo CANCELLED → riattivato a DRAFT", () => {
    const parsed = [ev("a", "2026-06-10T00:00:00Z", "2026-06-15T00:00:00Z")];
    const existingStays = [existing({ id: "s1", icalUid: "a", importStatus: "CANCELLED" })];
    const plan = reconcile(parsed, existingStays);
    expect(plan.toCancel).toHaveLength(0);
    expect(plan.toUpdate).toEqual([
      {
        stayId: "s1",
        importStatus: "DRAFT",
        arrivalDate: new Date("2026-06-10T00:00:00Z"),
        departureDate: new Date("2026-06-15T00:00:00Z"),
      },
    ]);
  });

  it("feed con UID duplicato → un solo soggiorno (vince l'ultimo)", () => {
    const parsed = [
      ev("a", "2026-06-10T00:00:00Z", "2026-06-12T00:00:00Z"),
      ev("a", "2026-06-11T00:00:00Z", "2026-06-13T00:00:00Z"),
    ];
    const plan = reconcile(parsed, []);
    expect(plan.toCreate).toHaveLength(1);
    expect(plan.toCreate[0].arrivalDate.toISOString()).toBe("2026-06-11T00:00:00.000Z");
    expect(plan.seen).toBe(1);
  });

  it("mix: uno nuovo, uno invariato, uno sparito", () => {
    const parsed = [
      ev("keep", "2026-06-10T00:00:00Z", "2026-06-15T00:00:00Z"),
      ev("new", "2026-07-01T00:00:00Z", "2026-07-05T00:00:00Z"),
    ];
    const existingStays = [
      existing({ id: "s_keep", icalUid: "keep" }),
      existing({ id: "s_gone", icalUid: "gone", hasGuests: false }),
    ];
    const plan = reconcile(parsed, existingStays);
    expect(plan.toCreate.map((c) => c.icalUid)).toEqual(["new"]);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.toCancel).toEqual([{ stayId: "s_gone", importStatus: "CANCELLED" }]);
  });
});
