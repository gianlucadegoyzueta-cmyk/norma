import { describe, expect, it } from "vitest";
import { TouristTaxDeclarationService } from "../services/declaration.service";
import type { TouristTaxConfigRepository } from "../ports/TouristTaxConfigRepository";
import type {
  DeclarationRecord,
  StayInPeriod,
  TouristTaxDeclarationRepository,
  UpsertDeclarationInput,
} from "../ports/TouristTaxDeclarationRepository";
import type { TouristTaxRule } from "../domain/rule";
import { ROMA } from "../domain/seed-data";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const ORG = "org_1";
const COMUNE = "c_roma";

function configRepo(rule: TouristTaxRule | null): TouristTaxConfigRepository {
  return {
    findRuleForDate: async () => rule,
    listVersions: async () => [],
    upsertVersion: async () => {
      throw new Error("non usato");
    },
  };
}

function declRepo(stays: StayInPeriod[], seed?: Partial<DeclarationRecord>) {
  const store = new Map<string, DeclarationRecord>();
  let lastUpsert: UpsertDeclarationInput | null = null;
  if (seed) {
    store.set("d1", {
      id: "d1",
      organizationId: ORG,
      comuneId: COMUNE,
      period: "2024-05",
      amountCents: 0,
      status: "DRAFT",
      remittanceMode: "MANUAL_EXPORT",
      ...seed,
    });
  }
  const repo: TouristTaxDeclarationRepository = {
    findStaysInPeriod: async () => stays,
    upsertDeclarationWithLines: async (input) => {
      lastUpsert = input;
      const rec: DeclarationRecord = {
        id: "d1",
        organizationId: input.organizationId,
        comuneId: input.comuneId,
        period: input.period,
        amountCents: input.amountCents,
        status: store.get("d1")?.status ?? "DRAFT",
        remittanceMode: "MANUAL_EXPORT",
      };
      store.set(rec.id, rec);
      return rec;
    },
    listDeclarations: async () => [...store.values()],
    getDeclaration: async (id, org) => {
      const r = store.get(id);
      return r && r.organizationId === org ? r : null;
    },
    getDeclarationLines: async () => [],
    updateDeclaration: async (id, org, patch) => {
      const r = store.get(id);
      if (r && r.organizationId === org) store.set(id, { ...r, ...patch });
    },
  };
  return {
    repo,
    get lastUpsert() {
      return lastUpsert;
    },
    store,
  };
}

function stay(id: string, arrival: string, departure: string, guests: number): StayInPeriod {
  return {
    stayId: id,
    propertyName: `Prop ${id}`,
    comuneId: COMUNE,
    arrivalDate: d(arrival),
    departureDate: d(departure),
    accommodationCategory: null,
    touristTaxZone: null,
    guests: Array.from({ length: guests }, (_, i) => ({
      id: `${id}_g${i}`,
      birthDate: d("1990-01-01"),
      taxExemptionType: null,
    })),
  };
}

describe("TouristTaxDeclarationService.buildOrRecompute", () => {
  it("aggrega i soggiorni del periodo (Roma 6€/notte)", async () => {
    const stays = [
      stay("s1", "2024-05-01", "2024-05-03", 1),
      stay("s2", "2024-05-10", "2024-05-11", 2),
    ];
    const dr = declRepo(stays);
    const svc = new TouristTaxDeclarationService(dr.repo, configRepo(ROMA.rule));
    const out = await svc.buildOrRecompute({
      organizationId: ORG,
      comuneId: COMUNE,
      period: "2024-05",
    });
    expect(out.kind).toBe("OK");
    if (out.kind === "OK") {
      expect(out.declaration.amountCents).toBe(2400); // s1 2×600 + s2 1×2×600
      expect(out.staysCount).toBe(2);
    }
    expect(dr.lastUpsert?.lines).toHaveLength(2);
  });

  it("NO_RULE: soggiorni presenti ma nessuna regola → segnala, non inventa importi", async () => {
    const dr = declRepo([stay("s1", "2024-05-01", "2024-05-03", 1)]);
    const svc = new TouristTaxDeclarationService(dr.repo, configRepo(null));
    const out = await svc.buildOrRecompute({
      organizationId: ORG,
      comuneId: COMUNE,
      period: "2024-05",
    });
    expect(out.kind).toBe("NO_RULE");
  });

  it("LOCKED: una dichiarazione SUBMITTED non si ricalcola", async () => {
    const dr = declRepo([stay("s1", "2024-05-01", "2024-05-03", 1)], { status: "SUBMITTED" });
    const svc = new TouristTaxDeclarationService(dr.repo, configRepo(ROMA.rule));
    const out = await svc.buildOrRecompute({
      organizationId: ORG,
      comuneId: COMUNE,
      period: "2024-05",
    });
    expect(out.kind).toBe("LOCKED");
    if (out.kind === "LOCKED") expect(out.status).toBe("SUBMITTED");
  });
});

describe("TouristTaxDeclarationService.changeStatus", () => {
  it("DRAFT→READY→SUBMITTED valido, SUBMITTED→CANCELLED no", async () => {
    const dr = declRepo([], { status: "DRAFT" });
    const svc = new TouristTaxDeclarationService(dr.repo, configRepo(ROMA.rule));
    await svc.changeStatus("d1", ORG, "READY");
    await svc.changeStatus("d1", ORG, "SUBMITTED");
    expect(dr.store.get("d1")?.status).toBe("SUBMITTED");
    await expect(svc.changeStatus("d1", ORG, "CANCELLED")).rejects.toThrow();
  });

  it("isolamento: un'altra org non può cambiare stato", async () => {
    const dr = declRepo([], { status: "DRAFT" });
    const svc = new TouristTaxDeclarationService(dr.repo, configRepo(ROMA.rule));
    await expect(svc.changeStatus("d1", "org_altra", "READY")).rejects.toThrow();
  });
});
