// PORT del modulo Support: astrazioni così dominio e route non dipendono dal modello concreto.

import type {
  AssistantReply,
  KbEntry,
  NewTicket,
  OpenTicket,
  StoredTicket,
  SupportMessage,
} from "./support.types";

/** Sorgente dei fatti verificati su cui l'assistente DEVE ancorarsi. */
export interface KnowledgeBase {
  /** Le voci a confidenza piena (compliance). */
  entries(): KbEntry[];
}

/** Assistente AI host-facing. L'implementazione reale usa Claude; i test usano uno stub. */
export interface SupportAssistant {
  /**
   * Risponde alla domanda dell'host ancorandosi SOLO alla KB.
   * @param question domanda corrente
   * @param history messaggi precedenti per contesto (opzionale)
   */
  ask(question: string, history?: SupportMessage[]): Promise<AssistantReply>;
}

/** Persistenza e lettura dei ticket. L'impl reale usa Prisma; i test, memoria. */
export interface TicketStore {
  create(ticket: NewTicket): Promise<StoredTicket>;
  /** I ticket ancora aperti, più recenti prima (per l'inbox del founder, Fase 3). */
  listOpen(): Promise<OpenTicket[]>;
  /** Segna un ticket come risolto. */
  close(id: string): Promise<void>;
}

/** Avvisa il founder che un nuovo ticket richiede una risposta umana. */
export interface FounderNotifier {
  notify(ticket: { id: string; question: string }): Promise<void>;
}
