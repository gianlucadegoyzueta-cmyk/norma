import type { ParsedCode, ParsedComune } from "../domain/reference";
import type { ReferenceCounts, ReferenceTableRepository } from "../ports/reference";

/**
 * Repository in memoria per testare il TableSyncService senza DB.
 * Idempotente per costruzione: le mappe sono chiavate sul `code`, quindi rieseguire
 * la sincronizzazione sovrascrive le stesse chiavi e NON cambia il conteggio.
 */
export class InMemoryReferenceTableRepository implements ReferenceTableRepository {
  readonly comuni = new Map<string, ParsedComune>();
  readonly countries = new Map<string, ParsedCode>();
  readonly documentTypes = new Map<string, ParsedCode>();

  async upsertComuni(rows: readonly ParsedComune[]): Promise<number> {
    for (const r of rows) this.comuni.set(r.code, { ...r });
    return rows.length;
  }

  async upsertCountries(rows: readonly ParsedCode[]): Promise<number> {
    for (const r of rows) this.countries.set(r.code, { ...r });
    return rows.length;
  }

  async upsertDocumentTypes(rows: readonly ParsedCode[]): Promise<number> {
    for (const r of rows) this.documentTypes.set(r.code, { ...r });
    return rows.length;
  }

  async counts(): Promise<ReferenceCounts> {
    return {
      comuni: this.comuni.size,
      countries: this.countries.size,
      documentTypes: this.documentTypes.size,
    };
  }
}
