// Adapter REALE verso Stripe. Unico punto che importa l'SDK `stripe`.
// - createCheckoutSession / createPortalSession usano le API hosted (niente form carte custom).
// - parseWebhookEvent VERIFICA la firma (obbligatorio) e normalizza in BillingEvent.
//
// Le chiavi arrivano da env. Se mancano, `isConfigured()` è false e i metodi di rete lanciano
// BillingNotConfiguredError: la UI mostra i bottoni disabilitati con messaggio chiaro.

import Stripe from "stripe";
import {
  BillingNotConfiguredError,
  type BillingGateway,
  type CreateCheckoutParams,
  type CreatePortalParams,
  type ParsedWebhook,
  type UpdateSubscriptionQuantityParams,
} from "../ports/BillingGateway";
import { epochSecondsToDate, mapStripeStatus, planForLookupKey } from "../domain/stripe-mapping";
import type { BillingEvent } from "../domain/webhook";

export interface StripeBillingGatewayConfig {
  secretKey?: string | null;
  webhookSecret?: string | null;
}

/** Estrae l'id stringa da un campo Stripe che può essere id o oggetto espanso. */
function idOf(value: string | { id: string } | null | undefined): string | null {
  if (value == null) return null;
  return typeof value === "string" ? value : value.id;
}

export class StripeBillingGateway implements BillingGateway {
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string | null;

  constructor(config: StripeBillingGatewayConfig = {}) {
    // Una chiave passata ESPLICITAMENTE nel config (anche `null`) ha la precedenza sull'env:
    // così un caller — test inclusi — può simulare "non configurato" senza essere inquinato
    // dalle chiavi presenti nell'env locale. In produzione si costruisce con `{}` → usa l'env.
    const secretKey =
      "secretKey" in config ? (config.secretKey ?? null) : (process.env.STRIPE_SECRET_KEY ?? null);
    this.webhookSecret =
      "webhookSecret" in config
        ? (config.webhookSecret ?? null)
        : (process.env.STRIPE_WEBHOOK_SECRET ?? null);
    this.stripe = secretKey ? new Stripe(secretKey) : null;
  }

  isConfigured(): boolean {
    return this.stripe != null;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) throw new BillingNotConfiguredError();
    return this.stripe;
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<{ url: string }> {
    const stripe = this.requireStripe();
    const prices = await stripe.prices.list({
      lookup_keys: [params.lookupKey],
      active: true,
      limit: 1,
    });
    const price = prices.data[0];
    if (!price) {
      throw new Error(
        `Prezzo Stripe non trovato per lookup_key "${params.lookupKey}". ` +
          "Esegui prima `scripts/stripe-bootstrap.ts`.",
      );
    }

    const quantity = Number.isFinite(params.quantity)
      ? Math.max(1, Math.trunc(params.quantity ?? 1))
      : 1;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: price.id, quantity }],
      client_reference_id: params.organizationId,
      // metadata su session E su subscription: l'aggancio org↔Stripe resta robusto
      // a prescindere dall'ordine d'arrivo dei webhook.
      metadata: { organizationId: params.organizationId },
      subscription_data: { metadata: { organizationId: params.organizationId } },
      customer: params.existingCustomerId ?? undefined,
      customer_email: params.existingCustomerId ? undefined : (params.customerEmail ?? undefined),
      allow_promotion_codes: true,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });

    if (!session.url) throw new Error("Stripe non ha restituito un URL di checkout");
    return { url: session.url };
  }

  async createPortalSession(params: CreatePortalParams): Promise<{ url: string }> {
    const stripe = this.requireStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: params.stripeCustomerId,
      return_url: params.returnUrl,
    });
    return { url: session.url };
  }

  async updateSubscriptionQuantity(params: UpdateSubscriptionQuantityParams): Promise<void> {
    const stripe = this.requireStripe();
    const quantity = Number.isFinite(params.quantity)
      ? Math.max(1, Math.trunc(params.quantity))
      : 1;
    const subscription = await stripe.subscriptions.retrieve(params.stripeSubscriptionId);
    const item = subscription.items.data[0];
    if (!item?.id) {
      throw new Error("Subscription Stripe senza item: impossibile aggiornare quantity");
    }
    await stripe.subscriptions.update(params.stripeSubscriptionId, {
      items: [{ id: item.id, quantity }],
      proration_behavior: "none",
    });
  }

  async parseWebhookEvent(rawBody: string, signature: string): Promise<ParsedWebhook> {
    const stripe = this.requireStripe();
    if (!this.webhookSecret) throw new BillingNotConfiguredError("STRIPE_WEBHOOK_SECRET mancante");
    // constructEvent verifica la firma e lancia se non valida (nessuna chiamata di rete).
    const event = stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    return { eventId: event.id, type: event.type, event: normalizeEvent(event) };
  }
}

/** Traduce un evento Stripe nel nostro BillingEvent. Tipi non gestiti → null (ack 200). */
function normalizeEvent(event: Stripe.Event): BillingEvent | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const organizationId =
        session.client_reference_id ?? session.metadata?.organizationId ?? null;
      const stripeCustomerId = idOf(session.customer);
      if (!organizationId || !stripeCustomerId) return null;
      return {
        kind: "checkout.completed",
        organizationId,
        stripeCustomerId,
        stripeSubscriptionId: idOf(session.subscription),
      };
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      return subscriptionChangedEvent(sub);
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const stripeCustomerId = idOf(sub.customer);
      if (!stripeCustomerId) return null;
      return {
        kind: "subscription.deleted",
        stripeCustomerId,
        stripeSubscriptionId: sub.id,
      };
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeCustomerId = idOf(invoice.customer);
      if (!stripeCustomerId) return null;
      return {
        kind: "payment.failed",
        stripeCustomerId,
        stripeSubscriptionId: null,
      };
    }

    default:
      return null;
  }
}

function subscriptionChangedEvent(sub: Stripe.Subscription): BillingEvent | null {
  const stripeCustomerId = idOf(sub.customer);
  if (!stripeCustomerId) return null;
  const item = sub.items.data[0];
  const price = item?.price;
  const lookupKey = price?.lookup_key ?? null;
  return {
    kind: "subscription.changed",
    organizationId: sub.metadata?.organizationId ?? null,
    stripeCustomerId,
    stripeSubscriptionId: sub.id,
    status: mapStripeStatus(sub.status),
    plan: planForLookupKey(lookupKey),
    stripePriceId: price?.id ?? null,
    currentPeriodEnd: epochSecondsToDate(item?.current_period_end ?? null),
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    quantity: item?.quantity ?? 1,
  };
}
