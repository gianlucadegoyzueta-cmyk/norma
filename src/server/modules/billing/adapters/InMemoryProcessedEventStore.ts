// Adapter in-memory dell'idempotenza eventi: per i test del webhook service senza DB.

import type { ProcessedEventStore } from "../ports/ProcessedEventStore";

export class InMemoryProcessedEventStore implements ProcessedEventStore {
  private readonly seen = new Set<string>();

  async wasProcessed(eventId: string): Promise<boolean> {
    return this.seen.has(eventId);
  }

  async markProcessed(eventId: string): Promise<void> {
    this.seen.add(eventId);
  }
}
