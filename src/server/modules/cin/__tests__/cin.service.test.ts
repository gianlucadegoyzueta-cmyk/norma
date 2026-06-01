import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryCinRepository } from "../adapters/InMemoryCinRepository";
import { CinError, CinService } from "../services/cin.service";

describe("CinService", () => {
  let repo: InMemoryCinRepository;
  let service: CinService;

  beforeEach(() => {
    repo = new InMemoryCinRepository();
    repo.seed({
      id: "prop_1",
      organizationId: "org_1",
      name: "Bilocale",
      cin: null,
      cinStatus: "PENDING",
    });
    service = new CinService(repo);
  });

  it("saveCin: normalizza e marca OBTAINED", async () => {
    await service.saveCin({
      organizationId: "org_1",
      propertyId: "prop_1",
      cinRaw: " it039007b1xxxxx ",
    });
    const row = await repo.getById("org_1", "prop_1");
    expect(row?.cin).toBe("IT039007B1XXXXX");
    expect(row?.cinStatus).toBe("OBTAINED");
  });

  it("saveCin: rifiuta formato invalido", async () => {
    await expect(
      service.saveCin({ organizationId: "org_1", propertyId: "prop_1", cinRaw: "XX123" }),
    ).rejects.toBeInstanceOf(CinError);
  });

  it("saveCin: isolamento org", async () => {
    await expect(
      service.saveCin({
        organizationId: "org_2",
        propertyId: "prop_1",
        cinRaw: "IT039007B1XXXXX",
      }),
    ).rejects.toThrow("non trovato");
  });

  it("markNotRequired: azzera cin e imposta NOT_REQUIRED", async () => {
    await service.markNotRequired({ organizationId: "org_1", propertyId: "prop_1" });
    const row = await repo.getById("org_1", "prop_1");
    expect(row?.cin).toBeNull();
    expect(row?.cinStatus).toBe("NOT_REQUIRED");
  });

  it("getComplianceSummary: conta solo PENDING", async () => {
    repo.seed({
      id: "prop_2",
      organizationId: "org_1",
      name: "Monolocale",
      cin: "IT039007B1YYYYY",
      cinStatus: "OBTAINED",
    });
    const summary = await service.getComplianceSummary("org_1");
    expect(summary.count).toBe(1);
    expect(summary.needingCin[0]?.id).toBe("prop_1");
  });
});
