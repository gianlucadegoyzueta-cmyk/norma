// Tipi di dominio del modulo Alloggiati. PURI: nessuna dipendenza da rete o database.

/** Input per calcolare la dedup-key di una schedina. */
export interface DedupKeyInput {
  /** Identificativo stabile della struttura/credenziale (usiamo il credentialId). */
  struttura: string;
  /** IdAppartamento Alloggiati; null per le credenziali SINGOLA. */
  idAppartamento: string | null;
  /** Data di arrivo in formato canonico ISO "YYYY-MM-DD". */
  dataArrivo: string;
  /** Numero documento; stringa vuota per familiari/membri senza documento. */
  numeroDocumento: string;
  cognome: string;
  nome: string;
  /** Data di nascita in formato canonico ISO "YYYY-MM-DD". */
  dataNascita: string;
}

/**
 * Esito di un tentativo di invio dal punto di vista di UNA schedina.
 * NO_RESPONSE = timeout / errore di rete: NON sappiamo se è stata acquisita
 * → la schedina andrà in UNVERIFIED (mai ritentare alla cieca: rischio doppione).
 */
export type SendAttempt =
  | { kind: "ACQUIRED" }
  | { kind: "REJECTED"; errorCod?: string; errorDes?: string }
  | { kind: "NO_RESPONSE" };
