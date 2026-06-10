// Adapter in-memory del SubscriptionRepository: per i test del dominio/servizi senza DB.
// Stessa semantica del Prisma repo (upsert idempotente, match per org/customer).

import type { SubscriptionRecord, SubscriptionRepository } from "../ports/SubscriptionRepository";
import type { SubscriptionPatch } from "../domain/webhook";

let counter = 0;

function applyPatch(base: SubscriptionRecord, patch: SubscriptionPatch): SubscriptionRecord {
  return {
    ...base,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.plan !== undefined ? { plan: patch.plan } : {}),
    ...(patch.stripeCustomerId !== undefined ? { stripeCustomerId: patch.stripeCustomerId } : {}),
    ...(patch.stripeSubscriptionId !== undefined
      ? { stripeSubscriptionId: patch.stripeSubscriptionId }
      : {}),
    ...(patch.stripePriceId !== undefined ? { stripePriceId: patch.stripePriceId } : {}),
    ...(patch.currentPeriodEnd !== undefined ? { currentPeriodEnd: patch.currentPeriodEnd } : {}),
    ...(patch.cancelAtPeriodEnd !== undefined
      ? { cancelAtPeriodEnd: patch.cancelAtPeriodEnd }
      : {}),
    ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
  };
}

export class InMemorySubscriptionRepository implements SubscriptionRepository {
  private readonly byOrg = new Map<string, SubscriptionRecord>();

  constructor(seed: SubscriptionRecord[] = []) {
    for (const r of seed) this.byOrg.set(r.organizationId, r);
  }

  async getByOrganization(organizationId: string): Promise<SubscriptionRecord | null> {
    return this.byOrg.get(organizationId) ?? null;
  }

  async getByStripeCustomerId(stripeCustomerId: string): Promise<SubscriptionRecord | null> {
    for (const r of this.byOrg.values()) {
      if (r.stripeCustomerId === stripeCustomerId) return r;
    }
    return null;
  }

  async upsertByOrganization(
    organizationId: string,
    patch: SubscriptionPatch,
  ): Promise<SubscriptionRecord> {
    const existing = this.byOrg.get(organizationId);
    const base: SubscriptionRecord =
      existing ??
      ({
        id: `sub_mem_${++counter}`,
        organizationId,
        status: null,
        plan: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        quantity: 1,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      } satisfies SubscriptionRecord);
    const updated = applyPatch(base, patch);
    this.byOrg.set(organizationId, updated);
    return updated;
  }

  async updateByStripeCustomerId(
    stripeCustomerId: string,
    patch: SubscriptionPatch,
  ): Promise<SubscriptionRecord | null> {
    const existing = await this.getByStripeCustomerId(stripeCustomerId);
    if (!existing) return null;
    const updated = applyPatch(existing, patch);
    this.byOrg.set(existing.organizationId, updated);
    return updated;
  }
}
