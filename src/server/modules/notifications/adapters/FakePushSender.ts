import type { PushMessage, PushSender, PushSendResult } from "../ports";

/**
 * Transport push finto per i test: registra i messaggi senza toccare la rete.
 * NESSUNA chiamata reale a FCM/APNs in test/CI.
 */
export class FakePushSender implements PushSender {
  readonly sent: PushMessage[] = [];
  /** Se impostato, `send` lancia: simula un fallimento del canale. */
  failWith: Error | null = null;

  async send(message: PushMessage): Promise<PushSendResult> {
    if (this.failWith) throw this.failWith;
    this.sent.push(message);
    return { ok: message.tokens.length, failed: 0 };
  }
}
