import type { EmailMessage, EmailSender } from "../ports";

/**
 * Transport finto per i test: registra i messaggi inviati senza toccare la rete.
 * NESSUNA chiamata reale a Resend in test/CI.
 */
export class FakeEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  /** Se impostato, `send` lancia: simula un fallimento del canale. */
  failWith: Error | null = null;

  async send(message: EmailMessage): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.sent.push(message);
  }
}
