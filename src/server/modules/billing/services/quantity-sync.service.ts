import type { BillingGateway } from "../ports/BillingGateway";
import type { SubscriptionRepository } from "../ports/SubscriptionRepository";

/**
 * Mantiene allineata la quantity Stripe con il numero strutture dell'organizzazione.
 * Non apre flussi di billing: sincronizza solo subscription gia` esistenti.
 */
export class BillingQuantitySyncService {
  constructor(
    private readonly gateway: BillingGateway,
    private readonly subscriptions: SubscriptionRepository,
  ) {}

  async syncOrganizationQuantity(
    organizationId: string,
    rawQuantity: number,
  ): Promise<"updated" | "skipped"> {
    const quantity = Number.isFinite(rawQuantity) ? Math.max(1, Math.trunc(rawQuantity)) : 1;
    const sub = await this.subscriptions.getByOrganization(organizationId);
    if (!sub?.stripeSubscriptionId) return "skipped";
    if (sub.status === "CANCELED") return "skipped";
    if (sub.quantity === quantity) return "skipped";

    await this.gateway.updateSubscriptionQuantity({
      stripeSubscriptionId: sub.stripeSubscriptionId,
      quantity,
    });
    await this.subscriptions.upsertByOrganization(organizationId, { quantity });
    return "updated";
  }
}
