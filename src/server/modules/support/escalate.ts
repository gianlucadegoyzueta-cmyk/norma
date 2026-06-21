import type { FounderNotifier, TicketStore } from "./ports";
import type { NewTicket, StoredTicket } from "./support.types";

/** Dipendenze dell'escalation: dove si salva il ticket e come si avvisa il founder. */
export interface EscalationDeps {
  store: TicketStore;
  notifier: FounderNotifier;
}

/**
 * Gestisce un'escalation: apre il ticket e avvisa il founder.
 * La notifica è best-effort: se l'email rompe, il ticket resta salvato (il founder lo vedrà
 * comunque nell'inbox della Fase 3). Mai perdere il ticket per colpa della notifica.
 */
export async function handleEscalation(
  input: NewTicket,
  deps: EscalationDeps,
): Promise<StoredTicket> {
  const ticket = await deps.store.create(input);
  try {
    await deps.notifier.notify({ id: ticket.id, question: input.question });
  } catch {
    // best-effort: il ticket è già persistito.
  }
  return ticket;
}
