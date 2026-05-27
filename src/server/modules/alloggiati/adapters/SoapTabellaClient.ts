import type { TipoTabella } from "../domain/reference";
import type { TabellaClient } from "../ports/reference";
import type { TokenProvider } from "./SoapAlloggiatiSender";

/**
 * Mapping tra le NOSTRE tabelle e il valore del parametro `tipo` (enum TipoTabella) del metodo
 * `Tabella`. VERIFICATO sul WSDL/servizio reale: i valori validi sono Luoghi, Tipi_Documento,
 * Tipi_Alloggiato (oltre a TipoErrore e ListaAppartamenti, non usati qui).
 */
const WS_TIPO: Record<TipoTabella, string> = {
  LUOGHI: "Luoghi",
  TIPI_DOCUMENTO: "Tipi_Documento",
  TIPI_ALLOGGIATO: "Tipi_Alloggiato",
};

/** Minimo per scaricare una tabella via SOAP. Lo soddisfa `AlloggiatiSoapClient`. */
export interface TabellaCapableClient {
  tabella(utente: string, token: string, tipo: string): Promise<string>;
}

/**
 * Adapter REALE del TabellaClient: ottiene il token della credenziale e scarica il CSV via SOAP.
 * È il "client SOAP passato come dipendenza" del TableSyncService. La sincronizzazione vera resta
 * l'ULTIMO passo: richiede credenziali Alloggiati reali (qui non invocate).
 */
export class SoapTabellaClient implements TabellaClient {
  constructor(
    private readonly tokens: TokenProvider,
    private readonly client: TabellaCapableClient,
    private readonly credentialId: string,
  ) {}

  async fetchTable(tipo: TipoTabella): Promise<string> {
    const { utente, token } = await this.tokens.getToken(this.credentialId);
    return this.client.tabella(utente, token, WS_TIPO[tipo]);
  }
}
