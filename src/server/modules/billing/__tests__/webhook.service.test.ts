import { describe, expect, it } from "vitest";
import { InMemoryProcessedEventStore } from "../adapters/InMemoryProcessedEventStore";
import { InMemorySubscriptionRepository } from "../adapters/InMemorySubscriptionRepository";
import type {
  BillingGateway,
  CreateCheckoutParams,
  CreatePortalParams,
  ParsedWebhook,
} from "../ports/BillingGateway";
import { StripeWebhookService } from "../services/webhook.service";

/** Gateway finto: restituisce un ParsedWebhook prefissato, ignora la firma. */
class FakeGateway implements BillingGateway {
  constructor(private readonly queue: ParsedWebhook[]) {}
  isConfigured(): boolean {
    return true;
  }
  async createCheckoutSession(_p: CreateCheckoutParams): Promise<{ url: string }> {
    return { url: "https://checkout.test" };
  }
  async createPortalSession(_p: CreatePortalParams): Promise<{ url: string }> {
    return { url: "https://portal.test" };
  }
  async parseWebhookEvent(): Promise<ParsedWebhook> {
    const next = this.queue.shift();
    if (!next) throw new Error("queue vuota");
    return next;
  }
}

function service(parsed: ParsedWebhook[]) {
  const subs = new InMemorySubscriptionRepository();
  const events = new InMemoryProcessedEventStore();
  const svc = new StripeWebhookService(new FakeGateway(parsed), subs, events);
  return { svc, subs, events };
}

describe("StripeWebhookService", () => {
  it("checkout.completed crea il record e lo collega al customer", async () => {
    const { svc, subs } = service([
      {
        eventId: "evt_1",
        type: "checkout.session.completed",
        event: {
          kind: "checkout.completed",
          organizationId: "org_1",
          stripeCustomerId: "cus_1",
          stripeSubscriptionId: "sub_1",
        },
      },
    ]);
    const res = await svc.handle("{}", "sig");
    expect(res.status).toBe("ok");
    const rec = await subs.getByOrganization("org_1");
    expect(rec?.stripeCustomerId).toBe("cus_1");
    expect(rec?.status).toBe("ACTIVE");
  });

  it("idempotenza: lo stesso event.id processato due volte → la seconda è duplicate", async () => {
    const parsed: ParsedWebhook = {
      eventId: "evt_dup",
      type: "checkout.session.completed",
      event: {
        kind: "checkout.completed",
        organizationId: "org_1",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
      },
    };
    const { svc } = service([parsed, parsed]);
    expect((await svc.handle("{}", "sig")).status).toBe("ok");
    expect((await svc.handle("{}", "sig")).status).toBe("duplicate");
  });

  it("subscription.changed con organizationId fa upsert anche senza checkout precedente", async () => {
    const periodEnd = new Date("2027-06-10T00:00:00.000Z");
    const { svc, subs } = service([
      {
        eventId: "evt_2",
        type: "customer.subscription.updated",
        event: {
          kind: "subscription.changed",
          organizationId: "org_42",
          stripeCustomerId: "cus_42",
          stripeSubscriptionId: "sub_42",
          status: "ACTIVE",
          plan: "ANNUAL",
          stripePriceId: "price_42",
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          quantity: 1,
        },
      },
    ]);
    await svc.handle("{}", "sig");
    const rec = await subs.getByOrganization("org_42");
    expect(rec?.status).toBe("ACTIVE");
    expect(rec?.plan).toBe("ANNUAL");
    expect(rec?.currentPeriodEnd).toEqual(periodEnd);
  });

  it("payment.failed porta lo stato a PAST_DUE (match per customer)", async () => {
    const subs = new InMemorySubscriptionRepository([
      {
        id: "s1",
        organizationId: "org_1",
        status: "ACTIVE",
        plan: "ANNUAL",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
        stripePriceId: "price_1",
        quantity: 1,
        currentPeriodEnd: new Date("2027-01-01"),
        cancelAtPeriodEnd: false,
      },
    ]);
    const events = new InMemoryProcessedEventStore();
    const svc = new StripeWebhookService(
      new FakeGateway([
        {
          eventId: "evt_3",
          type: "invoice.payment_failed",
          event: {
            kind: "payment.failed",
            stripeCustomerId: "cus_1",
            stripeSubscriptionId: null,
          },
        },
      ]),
      subs,
      events,
    );
    await svc.handle("{}", "sig");
    expect((await subs.getByOrganization("org_1"))?.status).toBe("PAST_DUE");
  });

  it("evento non gestito (event null) → ignored ma marcato processato", async () => {
    const { svc, events } = service([{ eventId: "evt_x", type: "customer.created", event: null }]);
    expect((await svc.handle("{}", "sig")).status).toBe("ignored");
    expect(await events.wasProcessed("evt_x")).toBe(true);
  });
});
