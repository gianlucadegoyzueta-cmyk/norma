// ============================================================
//  Take-rate — COMMISSIONE NORMA sulla riscossione della tassa di soggiorno. PURO.
//
//  Norma può trattenere una piccola commissione (% configurabile) sull'imposta che
//  riscuote per conto dell'host, versando il NETTO al comune. Questo file è solo il
//  CALCOLO: nessun DB, nessuna rete, nessun movimento di denaro reale.
//
//  Principi (coerenti col resto del modulo):
//   - denaro SEMPRE in centesimi (Int), mai float;
//   - la take-rate è in PUNTI BASE (bps): 1% = 100 bps, 2,5% = 250 bps. I bps evitano
//     i float anche su percentuali con decimali (es. 1,75%) restando interi;
//   - arrotondamento half-up esplicito sui centesimi, con INVARIANTE: fee + netto = lordo
//     (il netto è il complemento, mai ricalcolato a parte → nessun centesimo perso/creato);
//   - su lordo 0 (es. soggiorno tutto esente) la fee è 0: niente commissione sul nulla.
//
//  ⚠️ Questo è SCAFFOLDING di calcolo. L'incasso reale (Stripe Connect, money
//     transmission, versamento al comune) è un PORT separato e NON è implementato qui.
// ============================================================

/** Massimo ammesso per la take-rate: 100% (10 000 bps). Oltre è sicuramente un errore di config. */
export const MAX_TAKE_RATE_BPS = 10_000;

/** Default prudente se non configurata altrove: 0 bps = nessuna commissione (opt-in esplicito). */
export const DEFAULT_TAKE_RATE_BPS = 0;

/** Esito del calcolo della commissione su un importo lordo. Invariante: fee + net = gross. */
export interface NormaFeeBreakdown {
  /** Lordo: imposta di soggiorno dovuta (quella che oggi finisce in `amountCents`). */
  grossCents: number;
  /** Take-rate applicata, in punti base (per trasparenza e audit dello snapshot). */
  takeRateBps: number;
  /** Commissione trattenuta da Norma (arrotondata half-up). */
  normaFeeCents: number;
  /** Netto da versare al comune = gross − fee (complemento, mai negativo). */
  comuneNetCents: number;
}

export class InvalidTakeRateError extends Error {
  constructor(bps: number) {
    super(
      `Take-rate non valida: ${bps} bps (atteso intero in 0..${MAX_TAKE_RATE_BPS}, dove 100 bps = 1%)`,
    );
    this.name = "InvalidTakeRateError";
  }
}

/** Valida una take-rate in bps: intero, 0..10000. Lancia altrimenti. È la barriera del dominio. */
export function assertValidTakeRateBps(bps: number): void {
  if (!Number.isInteger(bps) || bps < 0 || bps > MAX_TAKE_RATE_BPS) {
    throw new InvalidTakeRateError(bps);
  }
}

/**
 * Calcola la commissione Norma su un importo lordo di tassa di soggiorno. PURA.
 *
 *  - `grossCents` deve essere un intero ≥ 0 (centesimi). Negativo o non intero → errore.
 *  - `takeRateBps` deve essere un intero 0..10000 (validato).
 *  - fee = round(gross × bps / 10000), half-up; net = gross − fee (complemento esatto).
 *
 * Esempi: gross 12000 (120,00 €) @ 250 bps (2,5%) → fee 300 (3,00 €), net 11700 (117,00 €).
 *         gross 0 @ qualunque bps → fee 0, net 0.
 */
export function computeNormaFee(grossCents: number, takeRateBps: number): NormaFeeBreakdown {
  if (!Number.isInteger(grossCents) || grossCents < 0) {
    throw new RangeError(`grossCents deve essere un intero ≥ 0 (ricevuto: ${grossCents})`);
  }
  assertValidTakeRateBps(takeRateBps);

  // half-up sui positivi: Math.round basta (gross e bps sono ≥ 0, prodotto ≥ 0).
  const normaFeeCents = Math.round((grossCents * takeRateBps) / 10_000);
  const comuneNetCents = grossCents - normaFeeCents; // complemento: fee + net = gross sempre

  return { grossCents, takeRateBps, normaFeeCents, comuneNetCents };
}

/** Converte bps in stringa percentuale italiana (es. 250 → "2,5%", 100 → "1%"). PURA. */
export function formatTakeRateBps(bps: number): string {
  const pct = bps / 100;
  return `${pct.toLocaleString("it-IT", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}
