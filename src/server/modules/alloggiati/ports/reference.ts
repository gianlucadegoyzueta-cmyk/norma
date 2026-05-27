// PORT della sincronizzazione tabelle di riferimento.
//  - TabellaClient: sorgente dei CSV (l'adapter reale è SOAP; nei test è un Fake).
//  - ReferenceTableRepository: destinazione (upsert idempotente + conteggi per l'health-check).
// Tenere i due lati dietro interfacce permette di testare il TableSyncService end-to-end senza
// né rete né database.

import type { ParsedCode, ParsedComune, TipoTabella } from "../domain/reference";

/** Restituisce il CSV grezzo (separato da ";") di una tabella. */
export interface TabellaClient {
  fetchTable(tipo: TipoTabella): Promise<string>;
}

/** Quanti record risultano presenti in ciascuna tabella (per health-check e report di sync). */
export interface ReferenceCounts {
  comuni: number;
  countries: number;
  documentTypes: number;
}

/**
 * Persistenza delle tabelle di riferimento. Gli upsert sono IDEMPOTENTI sulla chiave `code`
 * (UNIQUE a DB): rieseguire la sincronizzazione non crea doppioni e converge allo stesso stato.
 * Ogni metodo restituisce il numero di righe scritte (create + aggiornate).
 */
export interface ReferenceTableRepository {
  upsertComuni(rows: readonly ParsedComune[]): Promise<number>;
  upsertCountries(rows: readonly ParsedCode[]): Promise<number>;
  upsertDocumentTypes(rows: readonly ParsedCode[]): Promise<number>;
  counts(): Promise<ReferenceCounts>;
}
