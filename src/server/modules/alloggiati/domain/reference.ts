// Parsing + validazione delle TABELLE DI RIFERIMENTO ufficiali Alloggiati, scaricate dal metodo
// `Tabella` del web service in formato CSV separato da ";". PURO: stringa CSV → righe tipizzate e
// validate (niente DB né rete).
//
// Formato VERIFICATO sul servizio reale (2026-05):
//  - ogni tabella ha una RIGA DI INTESTAZIONE (es. "Codice;Descrizione;…"), che va saltata.
//  - `Luoghi` è UN'UNICA tabella per Comuni italiani E Stati esteri:
//        Codice;Descrizione;Provincia;DataFineVal
//      · Stato estero    ⇔ Provincia == "ES"   (es. 100000100;ITALIA;ES;)
//      · Comune italiano ⇔ Provincia = sigla    (es. 405028001;ABANO TERME;PD;)
//      · DataFineVal valorizzata = luogo soppresso/storico → lo TENIAMO (serve per i luoghi di nascita).
//  - `Tipi_Documento`: Codice;Descrizione   (codice 5 char, es. IDELE)
//  - `Tipi_Alloggiato`: Codice;Descrizione   (codice 2 char, 16..20)
//
// Le LARGHEZZE dei codici sono la stessa fonte di verità del tracciato (FIELD_LAYOUT): un codice va
// salvato ESATTAMENTE alla larghezza del campo, altrimenti `buildTracciatoRecord` lo rifiuta.

import { FIELD_LAYOUT } from "./tracciato";

/** Le tabelle che sincronizziamo. Nomi NOSTRI; il mapping ai valori dell'enum WS è nell'adapter SOAP. */
export type TipoTabella = "LUOGHI" | "TIPI_DOCUMENTO" | "TIPI_ALLOGGIATO";

/** Larghezze ufficiali dei codici, derivate dal tracciato → restano sempre in sync. */
export const CODE_WIDTHS = {
  comune: FIELD_LAYOUT.comuneNascita.len, // 9
  provincia: FIELD_LAYOUT.provinciaNascita.len, // 2
  country: FIELD_LAYOUT.statoNascita.len, // 9
  documentType: FIELD_LAYOUT.tipoDocumento.len, // 5
  tipoAlloggiato: FIELD_LAYOUT.tipoAlloggiato.len, // 2
} as const;

// Ordine colonne VERIFICATO sul servizio reale.
const COLUMNS = {
  luoghi: { code: 0, name: 1, provincia: 2 }, // colonna 3 = DataFineVal (ignorata)
  documentType: { code: 0, name: 1 },
  tipoAlloggiato: { code: 0, name: 1 },
} as const;

/** Valore della colonna "Provincia" che marca uno Stato estero (vs. una sigla provincia italiana). */
const PROVINCIA_ESTERO = "ES";

export interface ParsedComune {
  code: string;
  name: string;
  provincia: string;
}
export interface ParsedCode {
  code: string;
  name: string;
}
/** Esito dello split della tabella `Luoghi` in Comuni italiani e Stati esteri. */
export interface ParsedLuoghi {
  comuni: ParsedComune[];
  countries: ParsedCode[];
}

export class ReferenceCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReferenceCsvError";
  }
}

export interface ParseOptions {
  /** Salta la prima riga (intestazione). Il servizio reale la include sempre. */
  skipHeader?: boolean;
}

/** Spezza il CSV in righe di campi: ignora righe vuote, fa il trim di ogni campo. */
function splitRows(csv: string, skipHeader: boolean): string[][] {
  const rows = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(";").map((field) => field.trim()));
  return skipHeader ? rows.slice(1) : rows;
}

/** Legge la colonna `idx` di una riga, con errore chiaro se manca (riga troppo corta). */
function column(cols: string[], idx: number, label: string, line: number): string {
  const v: string | undefined = cols[idx];
  if (v === undefined) {
    throw new ReferenceCsvError(
      `${label}: colonna ${idx} assente alla riga ${line} (trovate ${cols.length} colonne).`,
    );
  }
  return v;
}

/** Verifica che un codice abbia ESATTAMENTE la larghezza ufficiale del campo. */
function requireWidth(value: string, width: number, label: string, line: number): string {
  if (value.length !== width) {
    throw new ReferenceCsvError(
      `${label}: codice "${value}" lungo ${value.length}, attesa larghezza ${width} (riga ${line}). ` +
        "I codici delle tabelle vanno salvati alla larghezza esatta del campo del tracciato.",
    );
  }
  return value;
}

function requireNonEmpty(value: string, label: string, line: number): string {
  if (value === "") {
    throw new ReferenceCsvError(`${label}: valore vuoto (riga ${line}).`);
  }
  return value;
}

/**
 * Parsa la tabella `Luoghi` e la SPLITTA in Comuni italiani e Stati esteri (discriminatore:
 * Provincia == "ES"). I codici (9 char) e le sigle provincia (2 char) sono validati in larghezza.
 */
export function parseLuoghiCsv(csv: string, opts: ParseOptions = {}): ParsedLuoghi {
  const comuni: ParsedComune[] = [];
  const countries: ParsedCode[] = [];
  splitRows(csv, !!opts.skipHeader).forEach((cols, i) => {
    const line = i + 1;
    const code = requireWidth(
      column(cols, COLUMNS.luoghi.code, "Luoghi.code", line),
      CODE_WIDTHS.comune,
      "Luoghi.code",
      line,
    );
    const name = requireNonEmpty(
      column(cols, COLUMNS.luoghi.name, "Luoghi.name", line),
      "Luoghi.name",
      line,
    );
    const provincia = requireWidth(
      column(cols, COLUMNS.luoghi.provincia, "Luoghi.provincia", line),
      CODE_WIDTHS.provincia,
      "Luoghi.provincia",
      line,
    );
    if (provincia === PROVINCIA_ESTERO) {
      countries.push({ code, name });
    } else {
      comuni.push({ code, name, provincia });
    }
  });
  return { comuni, countries };
}

export function parseDocumentTypesCsv(csv: string, opts: ParseOptions = {}): ParsedCode[] {
  return splitRows(csv, !!opts.skipHeader).map((cols, i) => {
    const line = i + 1;
    return {
      code: requireWidth(
        column(cols, COLUMNS.documentType.code, "DocumentType.code", line),
        CODE_WIDTHS.documentType,
        "DocumentType.code",
        line,
      ),
      name: requireNonEmpty(
        column(cols, COLUMNS.documentType.name, "DocumentType.name", line),
        "DocumentType.name",
        line,
      ),
    };
  });
}

export function parseTipiAlloggiatoCsv(csv: string, opts: ParseOptions = {}): ParsedCode[] {
  return splitRows(csv, !!opts.skipHeader).map((cols, i) => {
    const line = i + 1;
    return {
      code: requireWidth(
        column(cols, COLUMNS.tipoAlloggiato.code, "TipoAlloggiato.code", line),
        CODE_WIDTHS.tipoAlloggiato,
        "TipoAlloggiato.code",
        line,
      ),
      name: requireNonEmpty(
        column(cols, COLUMNS.tipoAlloggiato.name, "TipoAlloggiato.name", line),
        "TipoAlloggiato.name",
        line,
      ),
    };
  });
}
