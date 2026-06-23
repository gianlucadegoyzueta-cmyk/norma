// Adapter REALE: assistente via Claude (Anthropic Messages API, fetch — nessuna dipendenza SDK).
// DORMIENTE: senza ANTHROPIC_API_KEY non fa chiamate; ritorna una risposta che escala a un umano.
import { buildSystemPrompt } from "../domain/system-prompt";
import type { KnowledgeBase, SupportAssistant } from "../ports";
import type { AssistantReply, SupportMessage } from "../support.types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

/** Risposta di fallback: non si inventa nulla, si passa la mano a una persona. */
function escalateTo(answer: string): AssistantReply {
  return { answer, sources: [], escalate: true };
}

export class ClaudeAssistant implements SupportAssistant {
  constructor(private readonly kb: KnowledgeBase) {}

  async ask(question: string, history: SupportMessage[] = []): Promise<AssistantReply> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      // Dormiente: nessuna chiave → non rispondiamo a vuoto, passiamo a un umano.
      return escalateTo(
        "Il nostro assistente non è ancora attivo. Ti mettiamo in contatto con una persona del team.",
      );
    }

    const system = buildSystemPrompt(this.kb.entries());
    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: question },
    ];

    let res: Response;
    try {
      res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.SUPPORT_MODEL ?? "claude-sonnet-4-6",
          max_tokens: 1024,
          // La KB (~4k token) è identica a ogni richiesta → cache del prefisso system:
          // dopo il primo hit l'input della KB costa ~0.1x (≈ -64% sul costo per domanda).
          // I contenuti volatili (domanda + history) stanno in `messages`, dopo il system,
          // quindi non invalidano la cache.
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages,
        }),
      });
    } catch {
      return escalateTo("Sto avendo un problema tecnico. Ti faccio ricontattare da una persona.");
    }

    if (!res.ok) {
      return escalateTo("Sto avendo un problema tecnico. Ti faccio ricontattare da una persona.");
    }

    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text = (data.content ?? [])
      .map((b) => (b.type === "text" ? (b.text ?? "") : ""))
      .join("");

    return parseReply(text);
  }
}

/** Estrae l'oggetto JSON dalla risposta del modello; in caso di dubbio escala (mai inventare). */
function parseReply(text: string): AssistantReply {
  try {
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const obj = JSON.parse(json) as Partial<AssistantReply>;
    if (typeof obj.answer === "string") {
      const sources = Array.isArray(obj.sources)
        ? obj.sources.filter((s): s is string => typeof s === "string")
        : [];
      return {
        answer: obj.answer,
        sources,
        escalate: obj.escalate === true || sources.length === 0,
      };
    }
  } catch {
    // cade nel fallback sotto
  }
  return escalateTo(
    "Non riesco a rispondere con certezza. Ti metto in contatto con una persona del team.",
  );
}
