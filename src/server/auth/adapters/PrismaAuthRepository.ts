import type { PrismaClient } from "@prisma/client";
import type { AuthRepository, OrgMembership } from "../repository";

/** Implementazione Prisma del repository di auth. */
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async countMembershipsForUser(userId: string): Promise<number> {
    return this.prisma.membership.count({ where: { userId } });
  }

  /** Crea Organization + Membership OWNER in un'unica scrittura atomica (nested create). */
  async createPersonalOrganization(userId: string, name: string): Promise<{ organizationId: string }> {
    const org = await this.prisma.organization.create({
      data: {
        name,
        memberships: { create: { userId, role: "OWNER" } },
      },
      select: { id: true },
    });
    return { organizationId: org.id };
  }

  async listOrganizationsForUser(userId: string): Promise<OrgMembership[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      select: { organizationId: true, role: true, organization: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((m) => ({
      organizationId: m.organizationId,
      organizationName: m.organization.name,
      role: m.role,
    }));
  }
}
