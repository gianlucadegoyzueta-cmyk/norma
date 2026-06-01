// Selezione della VERSIONE di regola valida a una certa data. PURA e testabile.
// Le tariffe cambiano nel tempo (Firenze dal 2025-02-01, Milano per anno solare):
// per ogni comune esistono più versioni con [validFrom, validTo). Questa funzione sceglie
// quella valida alla DATA DEL SOGGIORNO, indipendentemente dall'ordine di input.

export interface VersionedConfig<T> {
  validFrom: Date;
  /** null = ancora valida (nessuna data di fine). */
  validTo: Date | null;
  value: T;
}

/**
 * Ritorna la versione valida a `date`: validFrom ≤ date < validTo (validTo null = aperta).
 * A parità (sovrapposizioni non previste) vince la validFrom più recente ≤ date.
 * Ritorna null se nessuna versione copre la data (→ il chiamante mostra "regola non disponibile").
 */
export function selectVersionAt<T>(configs: VersionedConfig<T>[], date: Date): T | null {
  let best: VersionedConfig<T> | null = null;
  for (const c of configs) {
    if (c.validFrom.getTime() > date.getTime()) continue; // non ancora in vigore
    if (c.validTo !== null && c.validTo.getTime() <= date.getTime()) continue; // già scaduta
    if (!best || c.validFrom.getTime() > best.validFrom.getTime()) best = c;
  }
  return best ? best.value : null;
}
