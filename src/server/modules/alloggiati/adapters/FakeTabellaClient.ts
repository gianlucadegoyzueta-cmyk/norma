import type { TipoTabella } from "../domain/reference";
import type { TabellaClient } from "../ports/reference";

/**
 * CSV di ESEMPIO per i test/sviluppo (NON dati ufficiali), nel formato REALE del servizio:
 * riga di intestazione + colonne come da `Tabella`. `Luoghi` contiene Comuni (Provincia = sigla)
 * e Stati esteri (Provincia = "ES"). I codici rispettano le larghezze reali (luogo 9, documento 5,
 * tipo alloggiato 2). In produzione le tabelle si popolano SOLO via TableSyncService col client vero.
 */
export const SAMPLE_CSV: Record<TipoTabella, string> = {
  LUOGHI: [
    "Codice;Descrizione;Provincia;DataFineVal",
    "405028001;ABANO TERME;PD;",
    "400000001;ROMA;RM;",
    "400000002;MILANO;MI;",
    "100000100;ITALIA;ES;",
    "100000215;FRANCIA;ES;",
  ].join("\n"),
  TIPI_DOCUMENTO: [
    "Codice;Descrizione",
    "IDELE;CARTA IDENTITA' ELETTRONICA",
    "PASOR;PASSAPORTO ORDINARIO",
    "PATEN;PATENTE DI GUIDA",
  ].join("\n"),
  TIPI_ALLOGGIATO: [
    "Codice;Descrizione",
    "16;OSPITE SINGOLO",
    "17;CAPO FAMIGLIA",
    "18;CAPO GRUPPO",
    "19;FAMILIARE",
    "20;MEMBRO GRUPPO",
  ].join("\n"),
};

/**
 * Implementazione FINTA del TabellaClient: restituisce CSV di esempio, senza toccare il web
 * service. Si possono sovrascrivere singole tabelle (es. per testare errori di formato).
 */
export class FakeTabellaClient implements TabellaClient {
  private readonly csvByTipo: Record<TipoTabella, string>;

  constructor(overrides: Partial<Record<TipoTabella, string>> = {}) {
    this.csvByTipo = { ...SAMPLE_CSV, ...overrides };
  }

  async fetchTable(tipo: TipoTabella): Promise<string> {
    return this.csvByTipo[tipo];
  }
}
