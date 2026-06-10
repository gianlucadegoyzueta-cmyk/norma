// Superficie pubblica del modulo Billing (Stripe).
// Dominio puro (piani, mappature, gating, reducer webhook) + porte + adapter + servizi.

export * from "./domain/plan";
export * from "./domain/stripe-mapping";
export * from "./domain/access";
export * from "./domain/webhook";

export * from "./ports/BillingGateway";
export * from "./ports/SubscriptionRepository";
export * from "./ports/ProcessedEventStore";
export * from "./ports/GuestActivity";

export * from "./adapters/StripeBillingGateway";
export * from "./adapters/InMemorySubscriptionRepository";
export * from "./adapters/InMemoryProcessedEventStore";
export * from "./adapters/PrismaSubscriptionRepository";
export * from "./adapters/PrismaProcessedEventStore";
export * from "./adapters/PrismaGuestActivityRepository";

export * from "./services/webhook.service";
export * from "./services/checkout.service";
export * from "./services/gating.service";
