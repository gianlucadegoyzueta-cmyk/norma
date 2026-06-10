// Mappatura PURA tra i valori Stripe e il nostro stato locale. Niente SDK qui:
// riceve stringhe/numeri già estratti dall'adapter e li traduce nel modello di dominio.
// Tenere questa logica isolata la rende testabile senza rete e senza chiavi.

import type { BillingPlan, SubscriptionStatus } from "@prisma/client";
import { PLANS } from "./plan";

/**
 * Traduce lo `status` di una subscription Stripe nel nostro enum.
 * Riferimento: https://stripe.com/docs/api/subscriptions/object#subscription_object-status
 * Uno status sconosciuto → null (prudenza: il gating tratterà "nessuno stato noto" come non attivo).
 */
export function mapStripeStatus(raw: string): SubscriptionStatus | null {
  switch (raw) {
    case "trialing":
      return "TRIALING";
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    case "incomplete":
      return "INCOMPLETE";
    case "incomplete_expired":
      return "INCOMPLETE_EXPIRED";
    case "unpaid":
      return "UNPAID";
    case "paused":
      return "PAUSED";
    default:
      return null;
  }
}

/**
 * Risale al nostro `BillingPlan` da uno `price.id` Stripe, data la corrispondenza
 * priceId → lookupKey nota all'app (ricavata al bootstrap/checkout). Se non mappabile → null.
 */
export function planForLookupKey(lookupKey: string | null | undefined): BillingPlan | null {
  if (!lookupKey) return null;
  return PLANS.find((p) => p.lookupKey === lookupKey)?.plan ?? null;
}

/** Converte un timestamp Stripe (secondi epoch) in Date; null se assente. */
export function epochSecondsToDate(seconds: number | null | undefined): Date | null {
  if (seconds == null) return null;
  return new Date(seconds * 1000);
}
