// Verifica la FIRMA del webhook con eventi finti ma FIRMATI davvero (crypto, niente rete):
// usa stripe.webhooks.generateTestHeaderString per firmare un payload con un webhook secret di
// test, poi lo fa verificare/normalizzare al gateway reale.

import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { StripeBillingGateway } from "../adapters/StripeBillingGateway";

const WEBHOOK_SECRET = "whsec_test_secret";
// Chiave fittizia: il gateway istanzia l'SDK ma constructEvent NON fa chiamate di rete.
const stripe = new Stripe("sk_test_dummy");

function gateway() {
  return new StripeBillingGateway({
    secretKey: "sk_test_dummy",
    webhookSecret: WEBHOOK_SECRET,
  });
}

function sign(payload: string): string {
  return stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
}

function eventPayload(type: string, object: unknown): string {
  return JSON.stringify({
    id: `evt_${type.replace(/[^a-z]/g, "")}`,
    object: "event",
    type,
    data: { object },
  });
}

describe("StripeBillingGateway.parseWebhookEvent — firma", () => {
  it("firma valida + checkout.session.completed → normalizzato", async () => {
    const payload = eventPayload("checkout.session.completed", {
      id: "cs_1",
      object: "checkout.session",
      client_reference_id: "org_1",
      customer: "cus_1",
      subscription: "sub_1",
    });
    const parsed = await gateway().parseWebhookEvent(payload, sign(payload));
    expect(parsed.type).toBe("checkout.session.completed");
    expect(parsed.event).toEqual({
      kind: "checkout.completed",
      organizationId: "org_1",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
  });

  it("firma NON valida → lancia (la route risponderà 400)", async () => {
    const payload = eventPayload("checkout.session.completed", { id: "cs_1" });
    await expect(gateway().parseWebhookEvent(payload, "t=1,v1=deadbeef")).rejects.toThrow();
  });

  it("customer.subscription.updated → mappa stato, piano e periodo", async () => {
    const payload = eventPayload("customer.subscription.updated", {
      id: "sub_9",
      object: "subscription",
      customer: "cus_9",
      status: "active",
      cancel_at_period_end: false,
      metadata: { organizationId: "org_9" },
      items: {
        object: "list",
        data: [
          {
            id: "si_1",
            object: "subscription_item",
            quantity: 1,
            current_period_end: 1_800_000_000,
            price: {
              id: "price_annual",
              object: "price",
              lookup_key: "norma_annual_v1",
            },
          },
        ],
      },
    });
    const parsed = await gateway().parseWebhookEvent(payload, sign(payload));
    expect(parsed.event).toMatchObject({
      kind: "subscription.changed",
      organizationId: "org_9",
      stripeCustomerId: "cus_9",
      stripeSubscriptionId: "sub_9",
      status: "ACTIVE",
      plan: "ANNUAL",
      stripePriceId: "price_annual",
      cancelAtPeriodEnd: false,
      quantity: 1,
    });
  });

  it("tipo non gestito → event null (ack 200)", async () => {
    const payload = eventPayload("customer.created", { id: "cus_1", object: "customer" });
    const parsed = await gateway().parseWebhookEvent(payload, sign(payload));
    expect(parsed.event).toBeNull();
  });
});

describe("StripeBillingGateway — non configurato", () => {
  it("senza chiavi isConfigured() è false e i metodi di rete lanciano", async () => {
    const g = new StripeBillingGateway({ secretKey: null, webhookSecret: null });
    expect(g.isConfigured()).toBe(false);
    await expect(
      g.createPortalSession({ stripeCustomerId: "cus_1", returnUrl: "x" }),
    ).rejects.toThrow();
  });
});
