// Servizio webhook: verifica firma (via gateway), idempotenza per event.id, applicazione
// dello stato locale. Niente Stripe SDK qui: tutto passa dalle porte.
//
// Ordine: controlla duplicato → applica → segna processato. I patch sono ASSOLUTI (stato
// puntuale, non incrementi), quindi un'eventuale doppia applicazione è innocua; segnare DOPO
// l'applicazione evita di "bruciare" un evento se l'applicazione fallisce (Stripe ritenterà).

import { interpretBillingEvent } from "../domain/webhook";
import type { BillingGateway } from "../ports/BillingGateway";
import type { ProcessedEventStore } from "../ports/ProcessedEventStore";
import type { SubscriptionRepository } from "../ports/SubscriptionRepository";

export type WebhookResult =
  | { status: "ok" } // evento gestito e applicato
  | { status: "duplicate" } // event.id già processato → no-op
  | { status: "ignored" }; // tipo non gestito → ack 200 senza effetti

export class StripeWebhookService {
  constructor(
    private readonly gateway: BillingGateway,
    private readonly subscriptions: SubscriptionRepository,
    private readonly events: ProcessedEventStore,
  ) {}

  /**
   * Processa un webhook grezzo. LANCIA se la firma non è valida (la route → 400).
   * Errori applicativi (DB, ecc.) si propagano → la route risponde 500 e Stripe ritenta.
   */
  async handle(rawBody: string, signature: string): Promise<WebhookResult> {
    const parsed = await this.gateway.parseWebhookEvent(rawBody, signature);

    if (await this.events.wasProcessed(parsed.eventId)) {
      return { status: "duplicate" };
    }

    if (parsed.event) {
      const outcome = interpretBillingEvent(parsed.event);
      if (outcome.matchBy.by === "organizationId") {
        await this.subscriptions.upsertByOrganization(outcome.matchBy.value, outcome.patch);
      } else {
        await this.subscriptions.updateByStripeCustomerId(outcome.matchBy.value, outcome.patch);
      }
    }

    await this.events.markProcessed(parsed.eventId, parsed.type);
    return { status: parsed.event ? "ok" : "ignored" };
  }
}
