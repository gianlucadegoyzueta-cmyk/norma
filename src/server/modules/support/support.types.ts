// Tipi del modulo Support: il contratto della risposta dell'assistente AI host-facing.

/** Un fatto verificato della knowledge base di compliance. */
export interface KbEntry {
  id: string;
  claim: string;
  sourceUrl: string;
  dateVerified: string;
  tags: string[];
  /** "A" = verificato a confidenza piena (l'unico che l'assistente può usare). */
  confidence: string;
}

/** Un messaggio della conversazione. */
export interface SupportMessage {
  role: "user" | "assistant";
  content: string;
}

/** Risposta dell'assistente: ancorata alla KB, con fonti citabili e segnale di escalation. */
export interface AssistantReply {
  /** Testo della risposta per l'host. */
  answer: string;
  /** id delle voci KB usate (citabili). Vuoto se la risposta non poggia sulla KB. */
  sources: string[];
  /** true se l'AI non è sicura o serve un umano → si apre un ticket. */
  escalate: boolean;
}

/** Dati per aprire un ticket quando l'assistente escala (Fase 2). */
export interface NewTicket {
  /** Organizzazione dell'host se autenticato, altrimenti null (es. visitatore pre-signup). */
  organizationId: string | null;
  /** La domanda che ha innescato l'escalation. */
  question: string;
  /** Snapshot della conversazione al momento dell'escalation, per il follow-up umano. */
  conversation: SupportMessage[];
}

/** Ticket persistito: l'id serve a citarlo nella notifica al founder. */
export interface StoredTicket {
  id: string;
}

/** Un ticket aperto, come visto dall'inbox del founder (Fase 3). */
export interface OpenTicket {
  id: string;
  organizationId: string | null;
  question: string;
  conversation: SupportMessage[];
  createdAt: Date;
}
