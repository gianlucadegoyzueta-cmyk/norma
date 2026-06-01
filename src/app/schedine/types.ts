/**
 * Tipi condivisi tra le server action delle schedine e la UI (un file "use server" può esportare
 * solo funzioni async, quindi i tipi vivono qui).
 */

/** Una riga respinta, con messaggio già tradotto per l'host. */
export interface RejectedRow {
  guestName: string;
  errorCod: string | null;
  message: string;
}

/** Riepilogo strutturato dell'esito di un invio (derivato dagli stati DOPO il batch). */
export interface SendSummary {
  acquired: number;
  rejected: number;
  unverified: number;
  rejectedRows: RejectedRow[];
}

/** Esito di un'azione semplice (verifica). */
export interface OutboxResult {
  ok: boolean;
  message: string;
}

/** Esito dell'invio: come OutboxResult ma con l'eventuale riepilogo riga-per-riga. */
export interface SendResult extends OutboxResult {
  summary?: SendSummary;
}
