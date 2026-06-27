import { describe, expect, it } from "vitest";
import { InMemorySubscriptionRepository } from "../adapters/InMemorySubscriptionRepository";
import type {
  BillingGateway,
  CreateCheckoutParams,
  CreatePortalParams,
  ParsedWebhook,
  UpdateSubscriptionQuantityParams,
} from "../ports/BillingGateway";
import { BillingQuantitySyncService } from "../services/quantity-sync.service";

class RecordingGateway implements BillingGateway {
  lastQuantity?: UpdateSubscriptionQuantityParams;
  isConfigured(): boolean {
    return true;
  }
  async createCheckoutSession(_p: CreateCheckoutParams): Promise<{ url: string }> {
    return { url: "https://checkout.test" };
  }
  async createPortalSession(_p: CreatePortalParams): Promise<{ url: string }> {
    return { url: "https://portal.test" };
  }
  async updateSubscriptionQuantity(p: UpdateSubscriptionQuantityParams): Promise<void> {
    this.lastQuantity = p;
  }
  async parseWebhookEvent(): Promise<ParsedWebhook> {
    throw new Error("non usato");
  }
}

describe("BillingQuantitySyncService", () => {
  it("aggiorna Stripe e record locale quando quantity cambia", async () => {
    const gw = new RecordingGateway();
    const subs = new InMemorySubscriptionRepository([
      {
        id: "s1",
        organizationId: "org_1",
        status: "ACTIVE",
        plan: "MONTHLY",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
        stripePriceId: "price_1",
        quantity: 1,
        currentPeriodEnd: new Date("2027-01-01"),
        cancelAtPeriodEnd: false,
      },
    ]);
    const svc = new BillingQuantitySyncService(gw, subs);
    const result = await svc.syncOrganizationQuantity("org_1", 4);
    expect(result).toBe("updated");
    expect(gw.lastQuantity).toEqual({ stripeSubscriptionId: "sub_1", quantity: 4 });
    expect((await subs.getByOrganization("org_1"))?.quantity).toBe(4);
  });

  it("skippa se non esiste subscription Stripe", async () => {
    const gw = new RecordingGateway();
    const subs = new InMemorySubscriptionRepository();
    const svc = new BillingQuantitySyncService(gw, subs);
    const result = await svc.syncOrganizationQuantity("org_missing", 3);
    expect(result).toBe("skipped");
    expect(gw.lastQuantity).toBeUndefined();
  });

  it("skippa se subscription cancellata", async () => {
    const gw = new RecordingGateway();
    const subs = new InMemorySubscriptionRepository([
      {
        id: "s1",
        organizationId: "org_1",
        status: "CANCELED",
        plan: "MONTHLY",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
        stripePriceId: "price_1",
        quantity: 1,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ]);
    const svc = new BillingQuantitySyncService(gw, subs);
    const result = await svc.syncOrganizationQuantity("org_1", 5);
    expect(result).toBe("skipped");
    expect(gw.lastQuantity).toBeUndefined();
  });
});
