// PORT: astrazione dell'invio ad Alloggiati Web.
// La vera chiamata SOAP sarà un adapter implementato più avanti; per ora il resto
// del codice (e i test) dipende SOLO da questa interfaccia → outbox testabile senza
// toccare il sistema della Polizia.

/** Una riga del batch: la schedina (correlationId) + il suo record di tracciato. */
export interface SendRow {
  /** Id della nostra schedina, per correlare la risposta riga-per-riga. */
  correlationId: string;
  /** Stringa del tracciato record (168 char). La sua costruzione è un pezzo separato (futuro). */
  record: string;
}

export interface SendBatch {
  credentialId: string;
  rows: SendRow[];
}

/** Esito per singola riga restituito dal sistema. */
export type SendRowResult =
  | { correlationId: string; outcome: "ACQUIRED" }
  | { correlationId: string; outcome: "REJECTED"; errorCod?: string; errorDes?: string };

export interface SendBatchResult {
  results: SendRowResult[];
}

/**
 * Contratto dell'invio. L'implementazione reale (SOAP) potrà LANCIARE un'eccezione
 * in caso di timeout/assenza di risposta: l'outbox la tratterà come NO_RESPONSE → UNVERIFIED.
 */
export interface AlloggiatiSender {
  send(batch: SendBatch): Promise<SendBatchResult>;
}
