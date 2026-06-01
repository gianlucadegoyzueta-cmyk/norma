/**
 * Stato condiviso tra le server action del wizard e i componenti (un file "use server" può
 * esportare solo funzioni async, quindi i tipi vivono qui).
 */
export interface WizardActionState {
  ok: boolean;
  message?: string;
  /** Errori per campo (chiave = nome del campo nel form). */
  fieldErrors?: Record<string, string>;
  /** Valorizzato dallo step Alloggiati: id della credenziale appena verificata (per la sync). */
  credentialId?: string;
}
