// ============================================================
//  Risoluzione della take-rate EFFETTIVA per una dichiarazione. PURA.
//
//  Precedenza (più specifico vince):
//    1. override per-comune nella regola (TouristTaxRule.normaTakeRateBps)
//    2. default a livello organizzazione (Organization.normaTakeRateBps)
//    3. DEFAULT_TAKE_RATE_BPS (0 = nessuna commissione: opt-in esplicito)
//
//  Tutto in punti base (bps). Nessun DB, nessuna rete: gli input arrivano già risolti.
// ============================================================

import { assertValidTakeRateBps, DEFAULT_TAKE_RATE_BPS, MAX_TAKE_RATE_BPS } from "./take-rate";

export interface TakeRateSources {
  /** Override per-comune dalla regola valida alla data (TouristTaxRule.normaTakeRateBps). */
  comuneBps?: number | null;
  /** Default dell'organizzazione (Organization.normaTakeRateBps). */
  orgDefaultBps?: number | null;
}

/** Da dove proviene la take-rate effettiva (per trasparenza nello snapshot e nella UI). */
export type TakeRateOrigin = "COMUNE" | "ORGANIZATION" | "DEFAULT";

export interface ResolvedTakeRate {
  bps: number;
  origin: TakeRateOrigin;
}

/** Logga un warning se un valore di take-rate è fuori dal range ammesso (config smell osservabile,
 *  PRIMA della validazione hard che lancia). Niente logger strutturato nel dominio: console.warn. */
function warnIfOutOfRange(origin: TakeRateOrigin, bps: number): void {
  if (bps < 0 || bps > MAX_TAKE_RATE_BPS) {
    console.warn(
      `[tourist-tax] take-rate fuori range da ${origin}: ${bps} bps (atteso 0..${MAX_TAKE_RATE_BPS}). ` +
        "Verrà rifiutata: probabile errore di configurazione.",
    );
  }
}

/**
 * Risolve la take-rate effettiva applicando la precedenza comune → org → default.
 * Ogni valore presente è validato (intero 0..10000): una config malformata lancia,
 * non produce un calcolo silenziosamente errato. Un valore fuori range viene anche LOGGATO
 * (warning) prima del throw, così il problema di configurazione è visibile nei log.
 */
export function resolveTakeRateBps(sources: TakeRateSources): ResolvedTakeRate {
  if (sources.comuneBps !== undefined && sources.comuneBps !== null) {
    warnIfOutOfRange("COMUNE", sources.comuneBps);
    assertValidTakeRateBps(sources.comuneBps);
    return { bps: sources.comuneBps, origin: "COMUNE" };
  }
  if (sources.orgDefaultBps !== undefined && sources.orgDefaultBps !== null) {
    warnIfOutOfRange("ORGANIZATION", sources.orgDefaultBps);
    assertValidTakeRateBps(sources.orgDefaultBps);
    return { bps: sources.orgDefaultBps, origin: "ORGANIZATION" };
  }
  return { bps: DEFAULT_TAKE_RATE_BPS, origin: "DEFAULT" };
}
