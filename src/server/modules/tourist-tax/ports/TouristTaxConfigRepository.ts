// PORT: lettura/scrittura delle configurazioni tariffarie tassa di soggiorno.
// Il dominio (calcolatore) non conosce Prisma: riceve già la TouristTaxRule risolta.

import type { TouristTaxRule } from "../domain/rule";

/** Una versione di regola per un comune, con la sua finestra di validità. */
export interface TouristTaxConfigVersion {
  id: string;
  comuneId: string;
  validFrom: Date;
  validTo: Date | null;
  rule: TouristTaxRule;
}

/** Input per creare/aggiornare una versione (upsert idempotente per (comuneId, validFrom)). */
export interface UpsertTouristTaxConfigInput {
  comuneId: string;
  validFrom: Date;
  validTo?: Date | null;
  rule: TouristTaxRule;
}

export interface TouristTaxConfigRepository {
  /**
   * Regola valida per un comune ALLA DATA indicata (di norma la data di arrivo del soggiorno).
   * Ritorna null se non esiste alcuna versione che copre quella data → "regola non disponibile".
   */
  findRuleForDate(comuneId: string, date: Date): Promise<TouristTaxRule | null>;
  /** Tutte le versioni di un comune (per amministrazione/diagnostica). */
  listVersions(comuneId: string): Promise<TouristTaxConfigVersion[]>;
  /** Upsert idempotente di una versione (chiave logica: comuneId + validFrom). */
  upsertVersion(input: UpsertTouristTaxConfigInput): Promise<TouristTaxConfigVersion>;
}
