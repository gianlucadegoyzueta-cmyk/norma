// PORT del modulo Notifications: astrazione dell'invio email, così il dominio e i servizi
// non dipendono dal canale concreto (Resend) e i test usano un transport finto.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  /** Corpo HTML opzionale. Se assente, il canale invia solo `text` (retrocompatibile). */
  html?: string;
}

/** Invio di una singola email transazionale. L'implementazione reale riusa il canale Resend. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

// ----------------------- PUSH (app mobile) -----------------------

/** I due pilastri ricorrenti: il consenso e le categorie push sono granulari per pilastro. */
export type Pillar = "alloggiati" | "turismo";

export const PILLARS: readonly Pillar[] = ["alloggiati", "turismo"] as const;

export function isPillar(value: unknown): value is Pillar {
  return value === "alloggiati" || value === "turismo";
}

/** Messaggio push verso uno o più device token. `data` = payload applicativo (es. `path`). */
export interface PushMessage {
  tokens: string[];
  title: string;
  body: string;
  /** Pilastro di appartenenza (per categorizzazione lato OS e audit). */
  pillar: Pillar;
  /** Dati opachi consegnati all'app (es. `{ path: "/schedine" }` per il deep link al tap). */
  data?: Record<string, string>;
}

/** Esito aggregato di un invio (mai PII/token nei log: solo conteggi). */
export interface PushSendResult {
  ok: number;
  failed: number;
}

/**
 * Canale push astratto. L'implementazione reale (FCM/APNs) è iniettata; i test usano un fake.
 * Come per `EmailSender`, l'adapter concreto degrada a no-op senza credenziali.
 */
export interface PushSender {
  send(message: PushMessage): Promise<PushSendResult>;
}

/** Un device registrato per un utente. */
export interface DeviceTokenRecord {
  token: string;
  platform: "IOS" | "ANDROID";
}

/** Persistenza dei device token. L'adapter Prisma degrada a vuoto se la tabella non esiste. */
export interface DeviceTokenRepository {
  register(userId: string, device: DeviceTokenRecord): Promise<void>;
  remove(token: string): Promise<void>;
  listTokensForUser(userId: string): Promise<string[]>;
}

/** Consenso per-pilastro dell'host. Default opt-in; revocabile per singolo pilastro. */
export interface NotificationConsent {
  alloggiati: boolean;
  turismo: boolean;
}

/** Preferenze di notifica. L'adapter Prisma degrada al default (tutto true) se manca la tabella. */
export interface NotificationPreferenceRepository {
  get(userId: string): Promise<NotificationConsent>;
  set(userId: string, pillar: Pillar, enabled: boolean): Promise<void>;
}
