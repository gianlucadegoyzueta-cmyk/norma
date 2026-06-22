"use client";

import { useState } from "react";
import type { AssistantReply, SupportMessage } from "@/server/modules/support";

interface ChatTurn extends SupportMessage {
  sources?: string[];
  escalate?: boolean;
}

export function SupportChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    const history: SupportMessage[] = turns.map(({ role, content }) => ({
      role,
      content,
    }));
    setTurns((t) => [...t, { role: "user", content: question }]);
    setLoading(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      if (!res.ok) {
        setTurns((t) => [
          ...t,
          {
            role: "assistant",
            content:
              "Qualcosa non ha funzionato dalla mia parte. Riprova tra poco, o ti faccio ricontattare da una persona.",
            escalate: true,
          },
        ]);
        return;
      }
      const reply = (await res.json()) as AssistantReply;
      const answer =
        typeof reply.answer === "string" && reply.answer.trim()
          ? reply.answer
          : "Non riesco a risponderti con certezza. Ti metto in contatto con una persona del team.";
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: answer,
          sources: reply.sources ?? [],
          escalate: reply.escalate || !reply.answer,
        },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        {
          role: "assistant",
          content: "Problema di rete. Riprova tra poco.",
          escalate: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto" aria-live="polite">
        {turns.length === 0 && (
          <p className="text-sm text-gray-500">
            Es. &laquo;Devo fare le schedine Alloggiati per un ospite di una notte?&raquo;
          </p>
        )}
        {turns.map((turn, i) => (
          <div
            key={i}
            className={
              turn.role === "user"
                ? "self-end rounded-lg bg-gray-900 px-3 py-2 text-sm text-white"
                : "self-start rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-900"
            }
          >
            <p className="whitespace-pre-wrap">{turn.content}</p>
            {turn.sources && turn.sources.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">Fonti: {turn.sources.join(", ")}</p>
            )}
            {turn.escalate && turn.role === "assistant" && (
              <p className="mt-1 text-xs text-amber-600">
                Ti faremo ricontattare da una persona del team.
              </p>
            )}
          </div>
        ))}
        {loading && <p className="self-start text-sm text-gray-400">…</p>}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi la tua domanda…"
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          Invia
        </button>
      </form>
    </div>
  );
}
