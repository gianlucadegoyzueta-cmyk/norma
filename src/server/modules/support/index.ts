// Superficie pubblica del modulo Support.
export * from "./ports";
export * from "./support.types";
export * from "./domain/system-prompt";
export * from "./domain/admin-access";
export * from "./adapters/ClaudeAssistant";
export * from "./adapters/KbFromFile";
export * from "./escalate";
export * from "./adapters/PrismaTicketStore";
export * from "./adapters/EmailFounderNotifier";
// StubAssistant e InMemoryTicketStore sono solo per i test → non esportati qui.

import { ClaudeAssistant } from "./adapters/ClaudeAssistant";
import { KbFromFile } from "./adapters/KbFromFile";
import { PrismaTicketStore } from "./adapters/PrismaTicketStore";
import { EmailFounderNotifier } from "./adapters/EmailFounderNotifier";
import { ResendEmailSender } from "@/server/modules/notifications";
import type { SupportAssistant, TicketStore } from "./ports";
import type { EscalationDeps } from "./escalate";

/** Wiring di default: Claude ancorato alla KB verificata del modulo. */
export function createSupportAssistant(): SupportAssistant {
  return new ClaudeAssistant(new KbFromFile());
}

/** Store di default dei ticket (Prisma/Supabase). Usato dall'escalation e dall'inbox founder. */
export function createTicketStore(): TicketStore {
  return new PrismaTicketStore();
}

/**
 * Wiring di default dell'escalation: ticket persistito su Prisma + notifica email al founder.
 * Destinatario: SUPPORT_NOTIFY_EMAIL, fallback EMAIL_FROM (vuoto → notifica no-op, il ticket resta).
 */
export function createEscalationHandler(): EscalationDeps {
  const to = process.env.SUPPORT_NOTIFY_EMAIL ?? process.env.EMAIL_FROM ?? "";
  return {
    store: createTicketStore(),
    notifier: new EmailFounderNotifier(new ResendEmailSender(), to),
  };
}
