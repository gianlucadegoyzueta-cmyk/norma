import { describe, expect, it } from "vitest";
import { interpretBillingEvent, type BillingEvent } from "../domain/webhook";

describe("interpretBillingEvent", () => {
  it("checkout.completed → collega org↔customer e marca ACTIVE (ottimistico)", () => {
    const event: BillingEvent = {
      kind: "checkout.completed",
      organizationId: "org_1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    };
    const out = interpretBillingEvent(event);
    expect(out.matchBy).toEqual({ by: "organizationId", value: "org_1" });
    expect(out.patch.stripeCustomerId).toBe("cus_1");
    expect(out.patch.stripeSubscriptionId).toBe("sub_1");
    expect(out.patch.status).toBe("ACTIVE");
  });

  it("subscription.changed senza organizationId → match per stripeCustomerId", () => {
    const periodEnd = new Date("2027-06-10T00:00:00.000Z");
    const event: BillingEvent = {
      kind: "subscription.changed",
      organizationId: null,
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      status: "ACTIVE",
      plan: "ANNUAL",
      stripePriceId: "price_1",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      quantity: 1,
    };
    const out = interpretBillingEvent(event);
    expect(out.matchBy).toEqual({ by: "stripeCustomerId", value: "cus_1" });
    expect(out.patch).toMatchObject({
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      status: "ACTIVE",
      plan: "ANNUAL",
      stripePriceId: "price_1",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      quantity: 1,
    });
  });

  it("subscription.changed con organizationId (da metadata) → upsert per organizationId", () => {
    const out = interpretBillingEvent({
      kind: "subscription.changed",
      organizationId: "org_9",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
      status: "ACTIVE",
      plan: "MONTHLY",
      stripePriceId: "price_2",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      quantity: 1,
    });
    expect(out.matchBy).toEqual({ by: "organizationId", value: "org_9" });
    expect(out.patch.stripeCustomerId).toBe("cus_1");
  });

  it("subscription.deleted → CANCELED", () => {
    const out = interpretBillingEvent({
      kind: "subscription.deleted",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
    expect(out.matchBy).toEqual({ by: "stripeCustomerId", value: "cus_1" });
    expect(out.patch.status).toBe("CANCELED");
    expect(out.patch.cancelAtPeriodEnd).toBe(false);
  });

  it("payment.failed → PAST_DUE", () => {
    const out = interpretBillingEvent({
      kind: "payment.failed",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
    expect(out.patch.status).toBe("PAST_DUE");
  });
});
