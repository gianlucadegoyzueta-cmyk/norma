/**
 * Mappa di PRESENTAZIONE dei codici errore Alloggiati più comuni → messaggio azionabile per host
 * (non tecnici). NON è logica di dominio: traduce solo l'esito grezzo in un'indicazione utile.
 *
 * Principio di sicurezza: per i codici NON mappati si ricade SEMPRE sulla descrizione grezza
 * restituita dal portale — non inventiamo mai un significato. La mappa va estesa man mano che si
 * confermano altri codici dal servizio reale.
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Formato/contenuto riga non valido (cfr. test del tracciato).
  "11": "Dati della schedina non validi: ricontrolla i dati dell'ospite (documento, date) e ri-genera.",
  // Data di arrivo fuori finestra/non valida.
  "12": "La data di arrivo non è valida: correggi il soggiorno e ri-genera la schedina.",
};

/**
 * Restituisce un messaggio leggibile per host a partire dal codice/descrizione del portale.
 * Ordine: messaggio mappato (se codice noto) → descrizione grezza del portale → fallback generico.
 */
export function mapAlloggiatiError(cod: string | null, des: string | null): string {
  if (cod && ERROR_MESSAGES[cod]) return ERROR_MESSAGES[cod];
  const raw = des?.trim();
  if (raw) return raw;
  return "Il portale ha respinto la schedina ma non ha indicato il motivo. Usa il Test qui sopra per capire cosa correggere, poi rimettila in coda.";
}

/** True se il codice ha un messaggio azionabile mappato (utile per evidenziare il suggerimento). */
export function hasMappedError(cod: string | null): boolean {
  return Boolean(cod && ERROR_MESSAGES[cod]);
}
