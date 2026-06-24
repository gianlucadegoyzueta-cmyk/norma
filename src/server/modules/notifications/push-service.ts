// SERVIZIO di consegna delle notifiche push agli HOST (mai agli ospiti). Orchestra:
// consenso per-pilastro → token del device → invio tramite il PushSender iniettato.
//
// NON è un cron e NON aggancia ancora gli eventi di compliance (quello è PR2b): qui ci sono
// solo i binari, testabili con i fake. Circuit breaker: nel dubbio (niente consenso, niente
// token, errore del canale) NON invia e ritorna un esito neutro, senza mai lanciare.
//
// Privacy: nessun token né contenuto nei log; solo conteggi/esiti.

import type {
  DeviceTokenRepository,
  NotificationPreferenceRepository,
  Pillar,
  PushSender,
} from "./ports";

export interface NotifyInput {
  title: string;
  body: string;
  /** Dati applicativi opachi (es. `{ path: "/schedine" }` per il deep link al tap). */
  data?: Record<string, string>;
}

export type NotifyResult =
  | { ok: true; delivered: number }
  | { ok: false; reason: "consent_off" | "no_tokens" | "send_failed" };

export class PushNotificationService {
  constructor(
    private readonly sender: PushSender,
    private readonly devices: DeviceTokenRepository,
    private readonly preferences: NotificationPreferenceRepository,
  ) {}

  /** Invia una push all'utente per un pilastro, rispettando il consenso. */
  async notify(userId: string, pillar: Pillar, input: NotifyInput): Promise<NotifyResult> {
    const consent = await this.preferences.get(userId);
    if (!consent[pillar]) return { ok: false, reason: "consent_off" };

    const tokens = await this.devices.listTokensForUser(userId);
    if (tokens.length === 0) return { ok: false, reason: "no_tokens" };

    try {
      const result = await this.sender.send({
        tokens,
        title: input.title,
        body: input.body,
        pillar,
        ...(input.data ? { data: input.data } : {}),
      });
      return { ok: true, delivered: result.ok };
    } catch {
      // Niente PII nel log; il chiamante decide se ritentare.
      return { ok: false, reason: "send_failed" };
    }
  }
}
