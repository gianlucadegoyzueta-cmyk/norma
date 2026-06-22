// PORT: canale di TRASMISSIONE del movimento turistico all'ente regionale (ISTAT/Ross1000 & co).
//
// È la cerniera dell'"ISTAT AUTO": il dominio prepara il tracciato (XML/file) e lo passa al canale;
// QUALE canale dipende dalla regione (serializer). Oggi NESSUN canale è operativo — l'invio reale a un
// ente è una decisione umana esplicita (guardrail #1). Per questo ogni regione monta uno Stub adapter
// che ritorna NOT_IMPLEMENTED: la pipeline è completa end-to-end ma l'invio reale resta gated.
//
// Specchio fedele di tourist-tax/ports/RemittanceChannel: stesso contratto `isImplemented` + risultato
// discriminato. Quando una regione diventa AUTO (es. Sicilia WebAPI PMS) si sostituisce lo stub con un
// adapter operativo SENZA toccare il dominio né questo port.

import type { RegionSerializerId } from "../regional/routing";

/** Un file del tracciato già serializzato dal dominio della regione. */
export interface IstatSubmissionFile {
  filename: string;
  /** Tipo MIME del file (es. "application/xml", "text/plain"). */
  mimeType: string;
  content: string;
}

/** Payload pronto da trasmettere: il tracciato già serializzato dal dominio della regione. */
export interface IstatSubmissionPayload {
  /** Regione/serializer che ha prodotto il payload (decide il canale). */
  serializerId: RegionSerializerId;
  /** Periodo "YYYY-MM" del movimento. */
  period: string;
  /** Codice struttura presso l'ente (Ross1000Code, hotelCode, …): NON un segreto. */
  codiceStruttura: string;
  /**
   * File del tracciato già serializzati. Alcuni formati sono un file unico (Ross1000/SPOT XML),
   * altri uno-per-giorno (Umbria C/59): l'array li copre entrambi senza ramificare il dominio.
   */
  files: readonly IstatSubmissionFile[];
}

/**
 * Esito della trasmissione. NOT_IMPLEMENTED è il default sicuro finché il canale è uno stub:
 * il chiamante ricade sempre sull'export FILE manuale (l'host carica al portale). SENT/REJECTED
 * esistono per l'adapter operativo futuro, ma nessuno stub li ritorna mai.
 */
export type IstatSubmissionResult =
  | { kind: "NOT_IMPLEMENTED"; message: string }
  | { kind: "SENT"; reference?: string; message: string }
  | { kind: "REJECTED"; errors: readonly string[]; message: string };

export interface IstatSubmissionChannel {
  /** Regione/serializer coperto da questo canale. */
  readonly serializerId: RegionSerializerId;
  /** True solo se il canale trasmette davvero a un ente. Gli stub sono `false`. */
  readonly isImplemented: boolean;
  /**
   * Trasmette il payload all'ente. Implementazione reale GATED dietro flag + opt-in + conferma
   * (vedi il pattern Sicilia transmit.ts). Gli stub non aprono alcuna connessione: NOT_IMPLEMENTED.
   */
  submit(payload: IstatSubmissionPayload): Promise<IstatSubmissionResult>;
}
