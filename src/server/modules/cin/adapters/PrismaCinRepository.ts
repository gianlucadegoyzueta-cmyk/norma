import type { CinStatus, PrismaClient } from "@prisma/client";
import type { CinRepository, PropertyCinRecord } from "../ports";

const SELECT = {
  id: true,
  name: true,
  cin: true,
  cinStatus: true,
} as const;

export class PrismaCinRepository implements CinRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async updateCin(
    organizationId: string,
    propertyId: string,
    data: { cin: string | null; cinStatus: CinStatus },
  ): Promise<void> {
    const updated = await this.prisma.property.updateMany({
      where: { id: propertyId, organizationId },
      data: { cin: data.cin, cinStatus: data.cinStatus },
    });
    if (updated.count === 0) {
      throw new Error("Property not found");
    }
  }

  async listByOrganization(organizationId: string): Promise<PropertyCinRecord[]> {
    return this.prisma.property.findMany({
      where: { organizationId },
      select: SELECT,
      orderBy: { name: "asc" },
    });
  }

  async getById(organizationId: string, propertyId: string): Promise<PropertyCinRecord | null> {
    return this.prisma.property.findFirst({
      where: { id: propertyId, organizationId },
      select: SELECT,
    });
  }
}
