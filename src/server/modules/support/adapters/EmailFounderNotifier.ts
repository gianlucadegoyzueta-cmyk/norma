import type { EmailSender } from "@/server/modules/notifications";
import { buildFounderEmail } from "../domain/escalation";
import type { FounderNotifier } from "../ports";

/**
 * Notifica il founder via il canale email ESISTENTE (Resend; degrada in console senza chiave).
 * `to` vuoto → no-op silenzioso: il ticket resta comunque salvato.
 */
export class EmailFounderNotifier implements FounderNotifier {
  constructor(
    private readonly email: EmailSender,
    private readonly to: string,
  ) {}

  async notify(ticket: { id: string; question: string }): Promise<void> {
    if (!this.to) return;
    const { subject, text } = buildFounderEmail(ticket.id, ticket.question);
    await this.email.send({ to: this.to, subject, text });
  }
}
