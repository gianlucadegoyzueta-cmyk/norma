// Adapter Prisma di GuestActivityRepository. NON dipende dalla migrazione parcheggiata:
// legge la tabella `Guest`, già esistente. Usabile da subito per il gating.

import type { PrismaClient } from "@prisma/client";
import type { GuestActivityRepository, ManagedGuestStats } from "../ports/GuestActivity";

export class PrismaGuestActivityRepository implements GuestActivityRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getManagedGuestStats(organizationId: string): Promise<ManagedGuestStats> {
    const [count, first] = await Promise.all([
      this.prisma.guest.count({ where: { organizationId } }),
      this.prisma.guest.findFirst({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);
    return {
      managedGuestCount: count,
      firstManagedGuestAt: first?.createdAt ?? null,
    };
  }
}
