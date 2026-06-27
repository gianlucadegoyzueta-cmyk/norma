import { describe, expect, it } from "vitest";
import { InMemorySubscriptionRepository } from "../adapters/InMemorySubscriptionRepository";
import { ANNUAL_PLAN } from "../domain/plan";
import type {
  BillingGateway,
  CreateCheckoutParams,
  CreatePortalParams,
  ParsedWebhook,
  UpdateSubscriptionQuantityParams,
} from "../ports/BillingGateway";
import type { GuestActivityRepository, ManagedGuestStats } from "../ports/GuestActivity";
import { BillingCheckoutService, BillingNoCustomerError } from "../services/checkout.service";
import { BillingGatingService, WriteAccessDeniedError } from "../services/gating.service";

class RecordingGateway implements BillingGateway {
  lastCheckout?: CreateCheckoutParams;
  lastPortal?: CreatePortalParams;
  isConfigured(): boolean {
    return true;
  }
  async createCheckoutSession(p: CreateCheckoutParams): Promise<{ url: string }> {
    this.lastCheckout = p;
    return { url: "https://checkout.test" };
  }
  async createPortalSession(p: CreatePortalParams): Promise<{ url: string }> {
    this.lastPortal = p;
    return { url: "https://portal.test" };
  }
  async updateSubscriptionQuantity(_p: UpdateSubscriptionQuantityParams): Promise<void> {
    return;
  }
  async parseWebhookEvent(): Promise<ParsedWebhook> {
    throw new Error("non usato");
  }
}

class StubGuests implements GuestActivityRepository {
  constructor(private readonly stats: ManagedGuestStats) {}
  async getManagedGuestStats(): Promise<ManagedGuestStats> {
    return this.stats;
  }
}

describe("BillingCheckoutService", () => {
  it("startCheckout passa la lookup_key del piano e l'eventuale customer esistente", async () => {
    const gw = new RecordingGateway();
    const subs = new InMemorySubscriptionRepository([
      {
        id: "s1",
        organizationId: "org_1",
        status: "CANCELED",
        plan: null,
        stripeCustomerId: "cus_existing",
        stripeSubscriptionId: null,
        stripePriceId: null,
        quantity: 1,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ]);
    const svc = new BillingCheckoutService(gw, subs);
    const { url } = await svc.startCheckout({
      organizationId: "org_1",
      plan: "ANNUAL",
      quantity: 3,
      customerEmail: "host@example.com",
      successUrl: "https://app/ok",
      cancelUrl: "https://app/ko",
    });
    expect(url).toBe("https://checkout.test");
    expect(gw.lastCheckout?.lookupKey).toBe(ANNUAL_PLAN.lookupKey);
    expect(gw.lastCheckout?.existingCustomerId).toBe("cus_existing");
    expect(gw.lastCheckout?.quantity).toBe(3);
  });

  it("startPortal richiede un customer Stripe: senza, lancia BillingNoCustomerError", async () => {
    const svc = new BillingCheckoutService(
      new RecordingGateway(),
      new InMemorySubscriptionRepository(),
    );
    await expect(
      svc.startPortal({ organizationId: "org_nope", returnUrl: "https://app" }),
    ).rejects.toBeInstanceOf(BillingNoCustomerError);
  });
});

describe("BillingGatingService", () => {
  const NOW = new Date("2026-06-10T12:00:00.000Z");

  it("nessun abbonamento e zero ospiti → TRIAL", async () => {
    const svc = new BillingGatingService(
      new InMemorySubscriptionRepository(),
      new StubGuests({ managedGuestCount: 0, firstManagedGuestAt: null }),
    );
    const access = await svc.getAccess("org_1", NOW);
    expect(access.state).toBe("TRIAL");
    expect(access.canWrite).toBe(true);
  });

  it("abbonamento ACTIVE → SUBSCRIBED a prescindere dagli ospiti", async () => {
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
        currentPeriodEnd: new Date("2027-06-10"),
        cancelAtPeriodEnd: false,
      },
    ]);
    const svc = new BillingGatingService(
      subs,
      new StubGuests({ managedGuestCount: 99, firstManagedGuestAt: new Date("2026-01-01") }),
    );
    const access = await svc.getAccess("org_1", NOW);
    expect(access.state).toBe("SUBSCRIBED");
    expect(access.canWrite).toBe(true);
  });

  it("ospiti gestiti oltre la grazia e nessun abbonamento → EXPIRED, scrittura bloccata", async () => {
    const svc = new BillingGatingService(
      new InMemorySubscriptionRepository(),
      new StubGuests({
        managedGuestCount: 5,
        firstManagedGuestAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    );
    const access = await svc.getAccess("org_1", NOW);
    expect(access.state).toBe("EXPIRED");
    expect(access.canWrite).toBe(false);
    expect(access.canRead).toBe(true);
  });

  it("requireWriteAccess passa in TRIAL e lancia da EXPIRED", async () => {
    const trial = new BillingGatingService(
      new InMemorySubscriptionRepository(),
      new StubGuests({ managedGuestCount: 0, firstManagedGuestAt: null }),
    );
    await expect(trial.requireWriteAccess("org_1", NOW)).resolves.toMatchObject({
      state: "TRIAL",
    });

    const expired = new BillingGatingService(
      new InMemorySubscriptionRepository(),
      new StubGuests({
        managedGuestCount: 3,
        firstManagedGuestAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
    );
    await expect(expired.requireWriteAccess("org_1", NOW)).rejects.toBeInstanceOf(
      WriteAccessDeniedError,
    );
  });
});
