/**
 * Stato condiviso tra l'aggiunta ospiti (server action) e il form (un file "use server" può
 * esportare solo funzioni async, quindi i tipi vivono qui).
 */
export interface GuestPartyState {
  ok: boolean;
  message: string;
  /**
   * Errori per singolo campo: chiave = nome del campo nel form (es. "p0.firstName", "p1.sex").
   * La UI evidenzia i campi corrispondenti e fa scroll al primo.
   */
  fieldErrors?: Record<string, string>;
}
