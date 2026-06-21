// Orchestrazione della trasmissione Sicilia con GATE a tripla barriera (guardrail #1: invio reale = scelta umana).
// La trasmissione parte SOLO se TUTTI e tre i cancelli sono aperti:
//   1) flag d'ambiente globale (SICILIA_TRANSMIT_ENABLED === "true")
//   2) opt-in esplicito della singola struttura (perPropertyEnabled)
//   3) conferma esplicita della chiamata (confirmRealSend)
// Default: chiuso. Senza i tre, ritorna { sent: false } senza toccare la rete.

import type { SiciliaCredentials, SiciliaTransmitResult } from "./pms-client";
import type { SiciliaEndDay, SiciliaStay } from "./tracciato-xml";

export interface TransmitGateInput {
  enabledFlag: string | undefined; // process.env.SICILIA_TRANSMIT_ENABLED
  perPropertyEnabled: boolean; // opt-in della struttura
  confirmRealSend: boolean; // conferma esplicita del chiamante
}

export interface TransmitGateResult {
  ok: boolean;
  reason: string;
}

export function evaluateTransmitGate(input: TransmitGateInput): TransmitGateResult {
  if (input.enabledFlag !== "true") {
    return { ok: false, reason: "trasmissione disabilitata (flag globale non attivo)" };
  }
  if (!input.perPropertyEnabled) {
    return { ok: false, reason: "trasmissione non abilitata per questa struttura" };
  }
  if (!input.confirmRealSend) {
    return { ok: false, reason: "conferma invio reale mancante" };
  }
  return { ok: true, reason: "ok" };
}

/** Sottoinsieme del SiciliaPmsClient necessario per trasmettere (consente un fake nei test). */
export interface SiciliaTransmitClient {
  login(creds: SiciliaCredentials): Promise<string>;
  addStays(token: string, stays: readonly SiciliaStay[]): Promise<SiciliaTransmitResult>;
  endDay(token: string, endDay: SiciliaEndDay): Promise<SiciliaTransmitResult>;
  logout(token: string, userId: string): Promise<void>;
}

export interface SiciliaTransmitInput {
  stays: readonly SiciliaStay[];
  endDay?: SiciliaEndDay;
  gate: TransmitGateInput;
}

export interface SiciliaTransmitReport {
  sent: boolean;
  reason: string;
  add?: SiciliaTransmitResult;
  end?: SiciliaTransmitResult;
}

/**
 * Esegue la sequenza login → addStays → (endDay) → logout, SOLO se il gate è aperto.
 * Il logout è best-effort (un suo fallimento non invalida l'invio già avvenuto).
 */
export async function transmitSicilia(
  client: SiciliaTransmitClient,
  credentials: SiciliaCredentials,
  input: SiciliaTransmitInput,
): Promise<SiciliaTransmitReport> {
  const gate = evaluateTransmitGate(input.gate);
  if (!gate.ok) {
    return { sent: false, reason: gate.reason };
  }
  if (input.stays.length === 0) {
    return { sent: false, reason: "nessun soggiorno da trasmettere" };
  }

  const token = await client.login(credentials);
  const add = await client.addStays(token, input.stays);
  const end = input.endDay ? await client.endDay(token, input.endDay) : undefined;
  try {
    await client.logout(token, credentials.userId);
  } catch {
    // logout best-effort: ignorato
  }
  return { sent: true, reason: "ok", add, end };
}
