// Servizio che avvia Stripe Checkout (subscribe) e il Customer Portal (gestione/disdetta).
// Risolve il customer Stripe esistente (per non duplicarlo) e il piano scelto.

import type { BillingPlan } from "@prisma/client";
import { planByKind } from "../domain/plan";
import type { BillingGateway } from "../ports/BillingGateway";
import type { SubscriptionRepository } from "../ports/SubscriptionRepository";

export interface StartCheckoutInput {
  organizationId: string;
  plan: BillingPlan;
  quantity?: number;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface StartPortalInput {
  organizationId: string;
  returnUrl: string;
}

export class BillingNoCustomerError extends Error {
  constructor() {
    super("Nessun cliente Stripe per questa organizzazione: prima è necessario abbonarsi.");
    this.name = "BillingNoCustomerError";
  }
}

export class BillingCheckoutService {
  constructor(
    private readonly gateway: BillingGateway,
    private readonly subscriptions: SubscriptionRepository,
  ) {}

  isConfigured(): boolean {
    return this.gateway.isConfigured();
  }

  async startCheckout(input: StartCheckoutInput): Promise<{ url: string }> {
    const existing = await this.subscriptions.getByOrganization(input.organizationId);
    const def = planByKind(input.plan);
    return this.gateway.createCheckoutSession({
      organizationId: input.organizationId,
      lookupKey: def.lookupKey,
      quantity: Number.isFinite(input.quantity) ? Math.max(1, Math.trunc(input.quantity ?? 1)) : 1,
      customerEmail: input.customerEmail ?? null,
      existingCustomerId: existing?.stripeCustomerId ?? null,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });
  }

  async startPortal(input: StartPortalInput): Promise<{ url: string }> {
    const existing = await this.subscriptions.getByOrganization(input.organizationId);
    if (!existing?.stripeCustomerId) throw new BillingNoCustomerError();
    return this.gateway.createPortalSession({
      stripeCustomerId: existing.stripeCustomerId,
      returnUrl: input.returnUrl,
    });
  }
}
