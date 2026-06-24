import type { PushMessage, PushSender, PushSendResult } from "../ports";

/**
 * Adapter push concreto verso Firebase Cloud Messaging (HTTP v1), che instrada anche APNs per
 * iOS. **Inerte senza credenziali**: come `ResendEmailSender` degrada a console senza chiave,
 * qui senza `PUSH_ENABLED=true` + chiavi FCM/APNs NON tocca la rete e ritorna `{ ok: 0 }`.
 *
 * Il vero invio (firma del JWT service-account, POST a fcm.googleapis.com) si attiva al go-live
 * quando le chiavi sono caricate nei segreti (vedi NEEDS-HUMAN). Finché sono assenti, il
 * circuit breaker tiene tutto spento: nessuna consegna, nessun errore.
 */
export class FcmPushSender implements PushSender {
  /** Gate globale: la consegna reale è possibile solo se esplicitamente abilitata e configurata. */
  static isConfigured(): boolean {
    return process.env.PUSH_ENABLED === "true" && Boolean(process.env.FCM_SERVICE_ACCOUNT_JSON);
  }

  async send(message: PushMessage): Promise<PushSendResult> {
    if (!FcmPushSender.isConfigured() || message.tokens.length === 0) {
      // Niente PII/token nei log: solo l'intento e il conteggio.
      console.info(
        `[push] disabilitato o non configurato: skip ${message.tokens.length} token (${message.pillar})`,
      );
      return { ok: 0, failed: 0 };
    }
    // TODO(go-live): firmare il JWT del service account e POST a FCM HTTP v1 per ogni token,
    // mappando i token non validi → cleanup del DeviceToken. Implementazione gated dietro le chiavi.
    throw new Error("FcmPushSender: trasmissione reale non ancora implementata (attesa chiavi)");
  }
}
