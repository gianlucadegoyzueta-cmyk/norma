// Adapter Prisma del SubscriptionRepository. PRONTO ma dipende dalla migrazione PARCHEGGIATA
// (prisma/migrations-parked/...add_billing_subscription): finché non è applicata, la tabella
// `Subscription` non esiste a runtime. Il client Prisma è già generato dallo schema, quindi
// questo file COMPILA; va attivato solo dopo la migrazione (vedi NEEDS-HUMAN.md).

import type { PrismaClient } from "@prisma/client";
import type { SubscriptionRecord, SubscriptionRepository } from "../ports/SubscriptionRepository";
import type { SubscriptionPatch } from "../domain/webhook";

type PrismaSubscriptionRow = {
  id: string;
  organizationId: string;
  status: SubscriptionRecord["status"];
  plan: SubscriptionRecord["plan"];
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  quantity: number;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
};

function toRecord(row: PrismaSubscriptionRow): SubscriptionRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    status: row.status,
    plan: row.plan,
    stripeCustomerId: row.stripeCustomerId,
    stripeSubscriptionId: row.stripeSubscriptionId,
    stripePriceId: row.stripePriceId,
    quantity: row.quantity,
    currentPeriodEnd: row.currentPeriodEnd,
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
  };
}

export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getByOrganization(organizationId: string): Promise<SubscriptionRecord | null> {
    const row = await this.prisma.subscription.findUnique({ where: { organizationId } });
    return row ? toRecord(row) : null;
  }

  async getByStripeCustomerId(stripeCustomerId: string): Promise<SubscriptionRecord | null> {
    const row = await this.prisma.subscription.findUnique({ where: { stripeCustomerId } });
    return row ? toRecord(row) : null;
  }

  async upsertByOrganization(
    organizationId: string,
    patch: SubscriptionPatch,
  ): Promise<SubscriptionRecord> {
    const row = await this.prisma.subscription.upsert({
      where: { organizationId },
      create: { organizationId, ...patch },
      update: { ...patch },
    });
    return toRecord(row);
  }

  async updateByStripeCustomerId(
    stripeCustomerId: string,
    patch: SubscriptionPatch,
  ): Promise<SubscriptionRecord | null> {
    const existing = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId },
    });
    if (!existing) return null;
    const row = await this.prisma.subscription.update({
      where: { id: existing.id },
      data: { ...patch },
    });
    return toRecord(row);
  }
}
