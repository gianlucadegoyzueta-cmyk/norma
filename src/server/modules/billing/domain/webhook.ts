// Interpretazione PURA degli eventi webhook Stripe rilevanti per il billing.
//
// L'adapter (StripeBillingGateway) verifica la firma e normalizza l'evento Stripe in uno dei
// `BillingEvent` qui sotto (niente tipi SDK nel dominio). Questa funzione decide COSA fare:
// quale upsert/azione sullo stato locale. Il servizio esegue gli effetti (lookup org, scrittura DB).

import type { BillingPlan, SubscriptionStatus } from "@prisma/client";

/** Eventi Stripe che ci interessano, già normalizzati a forma minima e serializzabile. */
export type BillingEvent =
  | {
      kind: "checkout.completed";
      organizationId: string; // da client_reference_id impostato in fase di checkout
      stripeCustomerId: string;
      stripeSubscriptionId: string | null;
    }
  | {
      kind: "subscription.changed";
      /** Da subscription.metadata.organizationId (impostato al checkout). Rende l'aggancio
       *  robusto all'ordine d'arrivo degli eventi: se presente si fa upsert per organizzazione. */
      organizationId: string | null;
      stripeCustomerId: string;
      stripeSubscriptionId: string;
      status: SubscriptionStatus | null;
      plan: BillingPlan | null;
      stripePriceId: string | null;
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
      quantity: number;
    }
  | {
      kind: "subscription.deleted";
      stripeCustomerId: string;
      stripeSubscriptionId: string;
    }
  | {
      kind: "payment.failed";
      stripeCustomerId: string;
      stripeSubscriptionId: string | null;
    };

/** Campi dello stato locale `Subscription` aggiornabili da un evento. */
export interface SubscriptionPatch {
  status?: SubscriptionStatus | null;
  plan?: BillingPlan | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  currentPeriodEnd?: Date | null;
  cancelAtPeriodEnd?: boolean;
  quantity?: number;
}

/**
 * Come applicare l'evento allo stato locale:
 *  - `matchBy` dice con quale chiave ritrovare il record da aggiornare;
 *  - `organizationId` è presente solo per checkout.completed (lì si crea/collega il legame
 *    organizzazione ↔ cliente Stripe).
 */
export interface WebhookOutcome {
  matchBy: { by: "organizationId"; value: string } | { by: "stripeCustomerId"; value: string };
  patch: SubscriptionPatch;
}

export function interpretBillingEvent(event: BillingEvent): WebhookOutcome {
  switch (event.kind) {
    case "checkout.completed":
      // Collega l'organizzazione al customer Stripe. Lo stato preciso arriverà (o è già arrivato)
      // con subscription.changed; qui fissiamo gli ID e marchiamo ACTIVE in modo ottimistico.
      return {
        matchBy: { by: "organizationId", value: event.organizationId },
        patch: {
          stripeCustomerId: event.stripeCustomerId,
          stripeSubscriptionId: event.stripeSubscriptionId,
          status: "ACTIVE",
        },
      };

    case "subscription.changed": {
      const patch: SubscriptionPatch = {
        stripeCustomerId: event.stripeCustomerId,
        stripeSubscriptionId: event.stripeSubscriptionId,
        status: event.status,
        plan: event.plan,
        stripePriceId: event.stripePriceId,
        currentPeriodEnd: event.currentPeriodEnd,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
        quantity: event.quantity,
      };
      // Con organizationId nota (metadata) si fa UPSERT per organizzazione: il record viene
      // creato anche se l'evento subscription precede il checkout.completed.
      return event.organizationId
        ? { matchBy: { by: "organizationId", value: event.organizationId }, patch }
        : { matchBy: { by: "stripeCustomerId", value: event.stripeCustomerId }, patch };
    }

    case "subscription.deleted":
      return {
        matchBy: { by: "stripeCustomerId", value: event.stripeCustomerId },
        patch: {
          status: "CANCELED",
          cancelAtPeriodEnd: false,
        },
      };

    case "payment.failed":
      return {
        matchBy: { by: "stripeCustomerId", value: event.stripeCustomerId },
        patch: {
          status: "PAST_DUE",
        },
      };
  }
}
