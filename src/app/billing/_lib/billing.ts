// Composition root del billing lato app: cabla i servizi del modulo con Prisma e Stripe.
// Le letture sullo stato `Subscription` sono DIFENSIVE: la migrazione è PARCHEGGIATA, quindi
// finché non è applicata la tabella non esiste a runtime. In quel caso degradiamo con grazia
// (nessun abbonamento → si applica la logica del trial) senza far esplodere la pagina.

import { prisma } from "@/server/db";
import {
  BillingCheckoutService,
  BillingGatingService,
  PrismaGuestActivityRepository,
  PrismaProcessedEventStore,
  PrismaSubscriptionRepository,
  StripeBillingGateway,
  StripeWebhookService,
  type AccessDecision,
  type SubscriptionRecord,
} from "@/server/modules/billing";

export function billingGateway(): StripeBillingGateway {
  return new StripeBillingGateway();
}

export function checkoutService(): BillingCheckoutService {
  return new BillingCheckoutService(billingGateway(), new PrismaSubscriptionRepository(prisma));
}

export function gatingService(): BillingGatingService {
  return new BillingGatingService(
    new PrismaSubscriptionRepository(prisma),
    new PrismaGuestActivityRepository(prisma),
  );
}

export function webhookService(): StripeWebhookService {
  return new StripeWebhookService(
    billingGateway(),
    new PrismaSubscriptionRepository(prisma),
    new PrismaProcessedEventStore(prisma),
  );
}

/** Tabella `Subscription` assente (migrazione non ancora applicata)? Codice Prisma P2021. */
function isMissingTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2021"
  );
}

export interface BillingView {
  access: AccessDecision | null;
  subscription: SubscriptionRecord | null;
  /** false se la tabella Subscription non è ancora stata creata (migrazione parcheggiata). */
  ready: boolean;
  configured: boolean;
}

/**
 * Carica lo stato billing per la pagina, in modo robusto: se la migrazione non è applicata
 * (`ready=false`) la pagina lo comunica chiaramente invece di andare in errore.
 */
export async function loadBillingView(organizationId: string): Promise<BillingView> {
  const configured = billingGateway().isConfigured();
  try {
    const subscription = await new PrismaSubscriptionRepository(prisma).getByOrganization(
      organizationId,
    );
    const access = await gatingService().getAccess(organizationId);
    return { access, subscription, ready: true, configured };
  } catch (err) {
    if (isMissingTableError(err)) {
      return { access: null, subscription: null, ready: false, configured };
    }
    throw err;
  }
}
