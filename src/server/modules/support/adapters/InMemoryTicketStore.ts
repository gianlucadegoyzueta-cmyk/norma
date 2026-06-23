import type { TicketStore } from "../ports";
import type { NewTicket, OpenTicket, StoredTicket } from "../support.types";

/** Store in memoria per i test: niente DB, conserva i ticket per le asserzioni. */
export class InMemoryTicketStore implements TicketStore {
  /** I payload creati, nell'ordine d'inserimento (per le asserzioni dell'escalation). */
  public readonly tickets: NewTicket[] = [];
  private open: OpenTicket[] = [];

  async create(ticket: NewTicket): Promise<StoredTicket> {
    this.tickets.push(ticket);
    const id = `mem-${this.tickets.length}`;
    this.open.push({ id, ...ticket, createdAt: new Date(0) });
    return { id };
  }

  async listOpen(): Promise<OpenTicket[]> {
    return [...this.open];
  }

  async close(id: string): Promise<void> {
    this.open = this.open.filter((t) => t.id !== id);
  }
}
