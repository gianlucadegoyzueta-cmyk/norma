"use client";

import { useState } from "react";
import type { AssistantReply, SupportMessage } from "@/server/modules/support";

interface ChatTurn extends SupportMessage {
  sources?: string[];
  escalate?: boolean;
}

/** Argomenti rapidi: precompilano una domanda frequente e avviano la chat senza far digitare.
 *  Solo testo (nessun dato server): l'assistente risponde ancorato alla KB verificata. */
const QUICK_TOPICS: { label: string; question: string }[] = [
  {
    label: "Primo accesso Alloggiati",
    question: "Come faccio il primo accesso ad Alloggiati Web e collego le credenziali a Norma?",
  },
  {
    label: "Come funziona l'ISTAT",
    question: "Come funziona il movimento turistico ISTAT/Ross1000 e cosa devo fare ogni mese?",
  },
  {
    label: "Tassa di soggiorno: come dichiaro",
    question: "Come dichiaro la tassa di soggiorno e dove trovo il riepilogo da versare?",
  },
  {
    label: "Cos'è il CIN",
    question: "Cos'è il CIN e quando mi serve per la mia struttura?",
  },
  {
    label: "Schedine per ospite di una notte",
    question: "Devo fare le schedine Alloggiati per un ospite che resta una sola notte?",
  },
  {
    label: "Import iCal del calendario",
    question: "Come importo il calendario iCal delle prenotazioni dentro Norma?",
  },
];

export function SupportChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(rawQuestion: string = input) {
    const question = rawQuestion.trim();
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
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gray-500">
              Scegli un argomento o scrivi la tua domanda. Es. &laquo;Devo fare le schedine
              Alloggiati per un ospite di una notte?&raquo;
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {QUICK_TOPICS.map((topic) => (
                <button
                  key={topic.label}
                  type="button"
                  onClick={() => void send(topic.question)}
                  disabled={loading}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>
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
