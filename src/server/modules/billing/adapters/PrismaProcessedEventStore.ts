// Adapter Prisma dell'idempotenza eventi. Come PrismaSubscriptionRepository, dipende dalla
// migrazione PARCHEGGIATA (tabella `ProcessedStripeEvent`): compila ma va attivato dopo la migrazione.

import type { PrismaClient } from "@prisma/client";
import type { ProcessedEventStore } from "../ports/ProcessedEventStore";

export class PrismaProcessedEventStore implements ProcessedEventStore {
  constructor(private readonly prisma: PrismaClient) {}

  async wasProcessed(eventId: string): Promise<boolean> {
    const row = await this.prisma.processedStripeEvent.findUnique({
      where: { id: eventId },
    });
    return row != null;
  }

  async markProcessed(eventId: string, type: string): Promise<void> {
    // upsert per tollerare una doppia registrazione concorrente (idempotente).
    await this.prisma.processedStripeEvent.upsert({
      where: { id: eventId },
      create: { id: eventId, type },
      update: {},
    });
  }
}
