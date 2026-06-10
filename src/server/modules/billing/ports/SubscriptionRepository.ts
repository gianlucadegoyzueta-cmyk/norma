// PORT: persistenza dello stato locale dell'abbonamento (specchio dei webhook Stripe).
// I servizi non conoscono Prisma. Implementazioni: InMemory (test) + Prisma (prod).

import type { BillingPlan, SubscriptionStatus } from "@prisma/client";
import type { SubscriptionPatch } from "../domain/webhook";

export interface SubscriptionRecord {
  id: string;
  organizationId: string;
  status: SubscriptionStatus | null;
  plan: BillingPlan | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  quantity: number;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionRepository {
  getByOrganization(organizationId: string): Promise<SubscriptionRecord | null>;
  getByStripeCustomerId(stripeCustomerId: string): Promise<SubscriptionRecord | null>;
  /** Crea o aggiorna il record dell'organizzazione applicando il patch (idempotente). */
  upsertByOrganization(
    organizationId: string,
    patch: SubscriptionPatch,
  ): Promise<SubscriptionRecord>;
  /**
   * Aggiorna il record associato a un customer Stripe. Ritorna null se nessun record è
   * collegato a quel customer (evento arrivato prima dell'aggancio org↔customer).
   */
  updateByStripeCustomerId(
    stripeCustomerId: string,
    patch: SubscriptionPatch,
  ): Promise<SubscriptionRecord | null>;
}
