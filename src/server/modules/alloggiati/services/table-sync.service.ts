import {
  type ParseOptions,
  type ParsedCode,
  parseDocumentTypesCsv,
  parseLuoghiCsv,
  parseTipiAlloggiatoCsv,
} from "../domain/reference";
import { TIPO_ALLOGGIATO_CODE } from "../domain/tracciato";
import type { ReferenceTableRepository, TabellaClient } from "../ports/reference";

export class TableSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TableSyncError";
  }
}

export interface TableSyncReport {
  comuni: number;
  countries: number;
  documentTypes: number;
  /** I Tipi Alloggiato non si persistono (coperti dall'enum): qui li VALIDIAMO contro l'enum. */
  tipiAlloggiatoChecked: number;
}

/**
 * Sincronizza le tabelle di riferimento dal web service (via TabellaClient) al DB (via repository).
 *
 * Disciplina:
 *  1. scarica i CSV di `Luoghi`, `Tipi_Documento`, `Tipi_Alloggiato`;
 *  2. li PARSA e VALIDA tutti (larghezze codici) PRIMA di scrivere — un CSV malformato fa fallire
 *     l'intera sync senza persistere nulla (niente stato parziale). `Luoghi` viene SPLITTATO in
 *     Comuni italiani e Stati esteri (discriminatore Provincia == "ES");
 *  3. fa il cross-check dei Tipi Alloggiato contro l'enum hardcoded (16-20): se il servizio non
 *     espone un codice atteso, è un segnale che la nostra mappatura è da rivedere → errore chiaro;
 *  4. fa l'upsert idempotente di Comune/Country/DocumentType.
 *
 * NON popola dati finti: i CSV arrivano dal client iniettato (reale in produzione, Fake nei test).
 */
export class TableSyncService {
  private readonly parseOpts: ParseOptions;

  constructor(
    private readonly client: TabellaClient,
    private readonly repo: ReferenceTableRepository,
    options: { skipHeader?: boolean } = {},
  ) {
    // Il servizio reale include SEMPRE una riga di intestazione → default true.
    this.parseOpts = { skipHeader: options.skipHeader ?? true };
  }

  async syncAll(): Promise<TableSyncReport> {
    // 1) scarica
    const [luoghiCsv, docCsv, tipiCsv] = await Promise.all([
      this.client.fetchTable("LUOGHI"),
      this.client.fetchTable("TIPI_DOCUMENTO"),
      this.client.fetchTable("TIPI_ALLOGGIATO"),
    ]);

    // 2) parsa + valida TUTTO prima di scrivere (gli errori di formato qui lanciano).
    //    Luoghi → split in Comuni (sigla provincia) e Stati esteri (provincia "ES").
    const { comuni, countries } = parseLuoghiCsv(luoghiCsv, this.parseOpts);
    const documentTypes = parseDocumentTypesCsv(docCsv, this.parseOpts);
    const tipi = parseTipiAlloggiatoCsv(tipiCsv, this.parseOpts);

    // 3) cross-check Tipi Alloggiato vs enum (16-20)
    this.assertTipiAlloggiato(tipi);

    // 4) upsert idempotente
    const [nComuni, nCountries, nDocs] = await Promise.all([
      this.repo.upsertComuni(comuni),
      this.repo.upsertCountries(countries),
      this.repo.upsertDocumentTypes(documentTypes),
    ]);

    return {
      comuni: nComuni,
      countries: nCountries,
      documentTypes: nDocs,
      tipiAlloggiatoChecked: tipi.length,
    };
  }

  /** I codici che l'enum dà per scontati (16-20) devono esistere nella tabella del servizio. */
  private assertTipiAlloggiato(tipi: readonly ParsedCode[]): void {
    const expected = new Set(Object.values(TIPO_ALLOGGIATO_CODE));
    const got = new Set(tipi.map((t) => t.code));
    const missing = [...expected].filter((c) => !got.has(c));
    if (missing.length > 0) {
      throw new TableSyncError(
        `Tabella Tipi Alloggiato del servizio priva dei codici attesi dall'enum: mancano ${missing.join(", ")}. ` +
          "Verificare la mappatura TIPO_ALLOGGIATO_CODE (tracciato) contro il servizio reale prima di procedere.",
      );
    }
  }
}
