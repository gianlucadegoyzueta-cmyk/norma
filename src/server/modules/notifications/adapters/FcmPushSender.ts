import type { PushMessage, PushSender, PushSendResult } from "../ports";
import { GoogleAuth } from "google-auth-library";

/**
 * Adapter push concreto verso Firebase Cloud Messaging (HTTP v1), che instrada anche APNs per
 * iOS. **Inerte senza credenziali**: come `ResendEmailSender` degrada a console senza chiave,
 * qui senza `PUSH_ENABLED=true` + chiavi FCM/APNs NON tocca la rete e ritorna `{ ok: 0 }`.
 *
 * Il vero invio (firma del JWT service-account, POST a fcm.googleapis.com) si attiva al go-live
 * quando le chiavi sono caricate nei segreti (`FCM_SERVICE_ACCOUNT_JSON`, APNs). Finché assenti, il
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
    const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
    if (!raw) return { ok: 0, failed: 0 };

    let serviceAccount: {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    try {
      serviceAccount = JSON.parse(raw);
    } catch {
      throw new Error("FCM_SERVICE_ACCOUNT_JSON non è JSON valido");
    }
    const projectId = serviceAccount.project_id;
    const clientEmail = serviceAccount.client_email;
    const privateKey = serviceAccount.private_key;
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("FCM service account incompleto (project_id/client_email/private_key)");
    }

    const auth = new GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
    });
    const accessToken = await auth.getAccessToken();
    if (!accessToken) throw new Error("Impossibile ottenere access token FCM");

    const endpoint = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    let ok = 0;
    let failed = 0;

    for (const token of message.tokens) {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: message.title, body: message.body },
            ...(message.data ? { data: message.data } : {}),
            android: {
              priority: "high",
            },
            apns: {
              headers: { "apns-priority": "10" },
              payload: { aps: { sound: "default" } },
            },
          },
        }),
      });

      if (res.ok) {
        ok += 1;
        continue;
      }

      failed += 1;
    }

    return { ok, failed };
  }
}
