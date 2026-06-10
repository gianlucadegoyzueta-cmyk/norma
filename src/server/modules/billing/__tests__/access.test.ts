import { describe, expect, it } from "vitest";
import {
  decideAccess,
  POST_FIRST_GUEST_GRACE_DAYS,
  type GatingInput,
  type SubscriptionView,
} from "../domain/access";

const NOW = new Date("2026-06-10T12:00:00.000Z");

function input(over: Partial<GatingInput>): GatingInput {
  return {
    subscription: null,
    managedGuestCount: 0,
    firstManagedGuestAt: null,
    now: NOW,
    ...over,
  };
}

function sub(over: Partial<SubscriptionView>): SubscriptionView {
  return { status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, ...over };
}

describe("decideAccess — trial fino al primo ospite", () => {
  it("nessun ospite e nessun abbonamento → TRIAL, scrittura permessa, niente CTA", () => {
    const d = decideAccess(input({ managedGuestCount: 0 }));
    expect(d.state).toBe("TRIAL");
    expect(d.canWrite).toBe(true);
    expect(d.requiresSubscription).toBe(false);
  });

  it("primo ospite entro la finestra di grazia → GRACE, scrittura ancora permessa ma con CTA", () => {
    const firstGuest = new Date("2026-06-08T09:00:00.000Z"); // 2 giorni fa
    const d = decideAccess(input({ managedGuestCount: 1, firstManagedGuestAt: firstGuest }));
    expect(d.state).toBe("GRACE");
    expect(d.graceReason).toBe("FIRST_GUEST");
    expect(d.canWrite).toBe(true);
    expect(d.requiresSubscription).toBe(true);
    expect(d.graceEndsAt).toEqual(
      new Date(firstGuest.getTime() + POST_FIRST_GUEST_GRACE_DAYS * 86_400_000),
    );
  });

  it("primo ospite oltre la grazia e nessun abbonamento → EXPIRED, scrittura bloccata", () => {
    const firstGuest = new Date("2026-05-01T09:00:00.000Z"); // molto tempo fa
    const d = decideAccess(input({ managedGuestCount: 3, firstManagedGuestAt: firstGuest }));
    expect(d.state).toBe("EXPIRED");
    expect(d.canWrite).toBe(false);
    expect(d.canRead).toBe(true);
    expect(d.requiresSubscription).toBe(true);
  });

  it("la lettura è SEMPRE permessa, anche da scaduto", () => {
    const d = decideAccess(
      input({ managedGuestCount: 5, firstManagedGuestAt: new Date("2026-01-01") }),
    );
    expect(d.canRead).toBe(true);
  });
});

describe("decideAccess — abbonamento", () => {
  it("status ACTIVE → SUBSCRIBED, accesso pieno anche con ospiti gestiti", () => {
    const d = decideAccess(
      input({ subscription: sub({ status: "ACTIVE" }), managedGuestCount: 10 }),
    );
    expect(d.state).toBe("SUBSCRIBED");
    expect(d.canWrite).toBe(true);
    expect(d.requiresSubscription).toBe(false);
  });

  it("status TRIALING (trial Stripe) → SUBSCRIBED", () => {
    const d = decideAccess(input({ subscription: sub({ status: "TRIALING" }) }));
    expect(d.state).toBe("SUBSCRIBED");
  });

  it("cancelAtPeriodEnd ma ancora ACTIVE → resta SUBSCRIBED fino a fine periodo", () => {
    const d = decideAccess(
      input({
        subscription: sub({ status: "ACTIVE", cancelAtPeriodEnd: true }),
        managedGuestCount: 4,
      }),
    );
    expect(d.state).toBe("SUBSCRIBED");
    expect(d.canWrite).toBe(true);
  });

  it("PAST_DUE entro currentPeriodEnd → GRACE pagamento, scrittura permessa", () => {
    const d = decideAccess(
      input({
        subscription: sub({
          status: "PAST_DUE",
          currentPeriodEnd: new Date("2026-06-20T00:00:00.000Z"),
        }),
        managedGuestCount: 4,
      }),
    );
    expect(d.state).toBe("GRACE");
    expect(d.graceReason).toBe("PAYMENT_PAST_DUE");
    expect(d.canWrite).toBe(true);
  });

  it("PAST_DUE oltre currentPeriodEnd → trattato come non attivo (e con ospiti, scrittura bloccata)", () => {
    const d = decideAccess(
      input({
        subscription: sub({
          status: "PAST_DUE",
          currentPeriodEnd: new Date("2026-06-01T00:00:00.000Z"),
        }),
        managedGuestCount: 4,
        firstManagedGuestAt: new Date("2026-01-01"),
      }),
    );
    expect(d.state).toBe("EXPIRED");
    expect(d.canWrite).toBe(false);
  });

  it("CANCELED con ospiti gestiti oltre grazia → EXPIRED", () => {
    const d = decideAccess(
      input({
        subscription: sub({ status: "CANCELED" }),
        managedGuestCount: 2,
        firstManagedGuestAt: new Date("2026-01-01"),
      }),
    );
    expect(d.state).toBe("EXPIRED");
  });

  it("CANCELED ma nessun ospite ancora → torna al TRIAL", () => {
    const d = decideAccess(
      input({ subscription: sub({ status: "CANCELED" }), managedGuestCount: 0 }),
    );
    expect(d.state).toBe("TRIAL");
    expect(d.canWrite).toBe(true);
  });
});
