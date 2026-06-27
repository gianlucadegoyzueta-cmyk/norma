// PORT: il gateway di pagamento (Stripe). Isola l'SDK e la verifica firma dal resto.
// Implementazioni: StripeBillingGateway (reale) + adapter "non configurato" quando mancano
// le chiavi (la UI mostra i bottoni disabilitati con messaggio chiaro).

import type { BillingEvent } from "../domain/webhook";

export interface CreateCheckoutParams {
  organizationId: string;
  /** Quale prezzo: lookup_key del piano (annuale/mensile). */
  lookupKey: string;
  /** Numero unita` fatturate (es. strutture attive). */
  quantity?: number;
  /** Email da pre-compilare al checkout (se nuova subscription). */
  customerEmail?: string | null;
  /** Customer Stripe esistente, per non duplicarlo. */
  existingCustomerId?: string | null;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalParams {
  stripeCustomerId: string;
  returnUrl: string;
}

export interface UpdateSubscriptionQuantityParams {
  stripeSubscriptionId: string;
  quantity: number;
}

/** Esito della verifica+normalizzazione di un webhook. `event` null = tipo non gestito (ack 200). */
export interface ParsedWebhook {
  eventId: string;
  type: string;
  event: BillingEvent | null;
}

export interface BillingGateway {
  /** false se mancano le chiavi: i servizi/route restano funzionanti ma "in sola lettura". */
  isConfigured(): boolean;
  createCheckoutSession(params: CreateCheckoutParams): Promise<{ url: string }>;
  createPortalSession(params: CreatePortalParams): Promise<{ url: string }>;
  updateSubscriptionQuantity(params: UpdateSubscriptionQuantityParams): Promise<void>;
  /**
   * Verifica la FIRMA del webhook (obbligatoria) e normalizza l'evento Stripe in `BillingEvent`.
   * Deve LANCIARE se la firma non è valida (la route risponderà 400, niente retry).
   */
  parseWebhookEvent(rawBody: string, signature: string): Promise<ParsedWebhook>;
}

/** Errore di configurazione (chiavi mancanti): usato per messaggi UI chiari. */
export class BillingNotConfiguredError extends Error {
  constructor(message = "Billing non configurato: chiavi Stripe mancanti") {
    super(message);
    this.name = "BillingNotConfiguredError";
  }
}
