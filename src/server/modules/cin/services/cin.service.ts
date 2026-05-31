import { propertyNeedsCin, validateCinFormat } from "../domain/cin";
import type { CinRepository, PropertyCinRecord } from "../ports";

export class CinError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CinError";
  }
}

export interface CinComplianceSummary {
  /** Immobili che richiedono ancora il CIN (alert dashboard). */
  needingCin: PropertyCinRecord[];
  count: number;
}

export class CinService {
  constructor(private readonly properties: CinRepository) {}

  async saveCin(input: {
    organizationId: string;
    propertyId: string;
    cinRaw: string;
  }): Promise<void> {
    const validation = validateCinFormat(input.cinRaw);
    if (!validation.valid) throw new CinError(validation.reason);

    const exists = await this.properties.getById(input.organizationId, input.propertyId);
    if (!exists) throw new CinError("Immobile non trovato.");

    await this.properties.updateCin(input.organizationId, input.propertyId, {
      cin: validation.normalized,
      cinStatus: "OBTAINED",
    });
  }

  async markNotRequired(input: { organizationId: string; propertyId: string }): Promise<void> {
    const exists = await this.properties.getById(input.organizationId, input.propertyId);
    if (!exists) throw new CinError("Immobile non trovato.");

    await this.properties.updateCin(input.organizationId, input.propertyId, {
      cin: null,
      cinStatus: "NOT_REQUIRED",
    });
  }

  async getComplianceSummary(organizationId: string): Promise<CinComplianceSummary> {
    const all = await this.properties.listByOrganization(organizationId);
    const needingCin = all.filter((p) => propertyNeedsCin(p.cinStatus));
    return { needingCin, count: needingCin.length };
  }

  async listProperties(organizationId: string): Promise<PropertyCinRecord[]> {
    return this.properties.listByOrganization(organizationId);
  }
}
