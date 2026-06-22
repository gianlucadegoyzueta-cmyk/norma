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

import { assertValidTakeRateBps, DEFAULT_TAKE_RATE_BPS } from "./take-rate";

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

/**
 * Risolve la take-rate effettiva applicando la precedenza comune → org → default.
 * Ogni valore presente è validato (intero 0..10000): una config malformata lancia,
 * non produce un calcolo silenziosamente errato.
 */
export function resolveTakeRateBps(sources: TakeRateSources): ResolvedTakeRate {
  if (sources.comuneBps !== undefined && sources.comuneBps !== null) {
    assertValidTakeRateBps(sources.comuneBps);
    return { bps: sources.comuneBps, origin: "COMUNE" };
  }
  if (sources.orgDefaultBps !== undefined && sources.orgDefaultBps !== null) {
    assertValidTakeRateBps(sources.orgDefaultBps);
    return { bps: sources.orgDefaultBps, origin: "ORGANIZATION" };
  }
  return { bps: DEFAULT_TAKE_RATE_BPS, origin: "DEFAULT" };
}
