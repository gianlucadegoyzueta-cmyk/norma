import type { CinStatus } from "@prisma/client";
import type { CinRepository, PropertyCinRecord } from "../ports";

/** Repository CIN in memoria per i test (niente DB). */
export class InMemoryCinRepository implements CinRepository {
  private readonly rows = new Map<string, PropertyCinRecord & { organizationId: string }>();

  /** Helper test: registra un immobile con stato CIN iniziale. */
  seed(property: PropertyCinRecord & { organizationId: string }): void {
    this.rows.set(property.id, { ...property });
  }

  async updateCin(
    organizationId: string,
    propertyId: string,
    data: { cin: string | null; cinStatus: CinStatus },
  ): Promise<void> {
    const row = this.rows.get(propertyId);
    if (!row || row.organizationId !== organizationId) {
      throw new Error("Property not found");
    }
    row.cin = data.cin;
    row.cinStatus = data.cinStatus;
  }

  async listByOrganization(organizationId: string): Promise<PropertyCinRecord[]> {
    return [...this.rows.values()]
      .filter((r) => r.organizationId === organizationId)
      .map(({ organizationId: _org, ...item }) => item);
  }

  async getById(organizationId: string, propertyId: string): Promise<PropertyCinRecord | null> {
    const row = this.rows.get(propertyId);
    if (!row || row.organizationId !== organizationId) return null;
    const { organizationId: _org, ...item } = row;
    return item;
  }
}
