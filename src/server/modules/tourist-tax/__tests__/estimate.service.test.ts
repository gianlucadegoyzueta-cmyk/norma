import { describe, expect, it } from "vitest";
import { formatEuroCents, TouristTaxEstimateService } from "../services/estimate.service";
import type { TouristTaxConfigRepository } from "../ports/TouristTaxConfigRepository";
import type { TouristTaxRule } from "../domain/rule";
import { ROMA } from "../domain/seed-data";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function fakeRepo(rule: TouristTaxRule | null): TouristTaxConfigRepository {
  return {
    findRuleForDate: async () => rule,
    listVersions: async () => [],
    upsertVersion: async () => {
      throw new Error("non usato nel test");
    },
    getOrgTakeRateBps: async () => null,
  };
}

describe("TouristTaxEstimateService", () => {
  it("OK: con regola, ritorna il risultato del calcolatore", async () => {
    const svc = new TouristTaxEstimateService(fakeRepo(ROMA.rule));
    const out = await svc.estimateForStay({
      comuneId: "c_roma",
      arrivalDate: d("2024-06-01"),
      departureDate: d("2024-06-03"),
      guests: [{ id: "a", birthDate: d("1990-01-01") }],
    });
    expect(out.kind).toBe("OK");
    if (out.kind === "OK") expect(out.result.totalCents).toBe(1200); // 2 notti × 6€
  });

  it("NO_RULE: senza regola → esito esplicito, niente calcolo", async () => {
    const svc = new TouristTaxEstimateService(fakeRepo(null));
    const out = await svc.estimateForStay({
      comuneId: "c_ignoto",
      arrivalDate: d("2024-06-01"),
      departureDate: d("2024-06-03"),
      guests: [{ id: "a", birthDate: d("1990-01-01") }],
    });
    expect(out.kind).toBe("NO_RULE");
    if (out.kind === "NO_RULE") expect(out.comuneId).toBe("c_ignoto");
  });

  it("mappa taxExemptionType dell'ospite nel calcolatore", async () => {
    const svc = new TouristTaxEstimateService(fakeRepo(ROMA.rule));
    const out = await svc.estimateForStay({
      comuneId: "c_roma",
      arrivalDate: d("2024-06-01"),
      departureDate: d("2024-06-03"),
      guests: [{ id: "p", birthDate: d("1985-01-01"), taxExemptionType: "FORZE_ORDINE" }],
    });
    expect(out.kind).toBe("OK");
    if (out.kind === "OK") {
      expect(out.result.totalCents).toBe(0);
      expect(out.result.guests[0].exempt).toBe(true);
    }
  });
});

describe("formatEuroCents", () => {
  it("euro italiani con 2 decimali", () => {
    expect(formatEuroCents(1260)).toBe("12,60 €");
    expect(formatEuroCents(0)).toBe("0,00 €");
    expect(formatEuroCents(600)).toBe("6,00 €");
  });
});
