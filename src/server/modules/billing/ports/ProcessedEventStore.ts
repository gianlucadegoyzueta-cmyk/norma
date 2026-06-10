// PORT: idempotenza dei webhook. Stripe ritenta gli eventi (errori/timeout): un `event.id`
// già processato non va riapplicato. Implementazioni: InMemory (test) + Prisma (prod).

export interface ProcessedEventStore {
  /** true se l'evento è GIÀ stato processato in passato. */
  wasProcessed(eventId: string): Promise<boolean>;
  /** Registra l'evento come processato (dopo averlo applicato con successo). */
  markProcessed(eventId: string, type: string): Promise<void>;
}
