import { sendTransactionalEmail } from "@/server/auth/email";
import type { EmailMessage, EmailSender } from "../ports";

/**
 * Adapter sul canale email ESISTENTE (Resend via HTTP, vedi `src/server/auth/email.ts`).
 * Niente nuova configurazione: riusa RESEND_API_KEY/EMAIL_FROM già presenti in produzione.
 * In locale senza chiave il canale degrada stampando in console (comportamento del canale stesso).
 */
export class ResendEmailSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    await sendTransactionalEmail({
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });
  }
}
