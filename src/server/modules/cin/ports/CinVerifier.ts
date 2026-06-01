/**
 * Port per verifiche esterne sul CIN (es. portale Ministero). NON implementato:
 * NORMA non richiede il CIN via API — l'host lo inserisce manualmente dopo BDSR.
 * Lo stub esiste per wiring futuro senza dipendenze di rete oggi.
 */
export interface CinVerifier {
  /** Verifica opzionale sul portale ufficiale. Stub: sempre skipped. */
  verify(_cin: string): Promise<{ verified: false; reason: "not_implemented" }>;
}
