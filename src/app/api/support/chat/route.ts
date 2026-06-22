import { NextResponse } from "next/server";
import {
  createEscalationHandler,
  createSupportAssistant,
  handleEscalation,
  type SupportMessage,
} from "@/server/modules/support";

export const dynamic = "force-dynamic";

interface ChatBody {
  question?: unknown;
  history?: unknown;
}

function isMessage(m: unknown): m is SupportMessage {
  return (
    !!m &&
    typeof m === "object" &&
    typeof (m as SupportMessage).content === "string" &&
    ((m as SupportMessage).role === "user" || (m as SupportMessage).role === "assistant")
  );
}

/** POST: domanda dell'host → risposta AI ancorata alla KB (o escalation a un umano). */
export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Campo 'question' mancante" }, { status: 400 });
  }

  const history: SupportMessage[] = Array.isArray(body.history)
    ? body.history.filter(isMessage).slice(-10)
    : [];

  const assistant = createSupportAssistant();
  const reply = await assistant.ask(question, history);

  if (reply.escalate) {
    // Apri un ticket e avvisa il founder. Best-effort: non deve bloccare la risposta all'host.
    try {
      await handleEscalation(
        {
          organizationId: null, // Fase 2.1: collegare l'org dalla sessione se l'host è autenticato.
          question,
          conversation: [...history, { role: "user", content: question }],
        },
        createEscalationHandler(),
      );
    } catch {
      // L'host riceve comunque la risposta; un ticket fallito non deve rompere la UX.
    }
  }

  return NextResponse.json(reply);
}
