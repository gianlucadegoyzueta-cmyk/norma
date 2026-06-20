// Adapter FINTO (per i test e come fallback sicuro): non chiama modelli, escala sempre.
// Non esportato dalla superficie pubblica del modulo.
import type { SupportAssistant } from "../ports";
import type { AssistantReply } from "../support.types";

export class StubAssistant implements SupportAssistant {
  async ask(): Promise<AssistantReply> {
    return {
      answer: "Assistente non configurato (stub).",
      sources: [],
      escalate: true,
    };
  }
}
