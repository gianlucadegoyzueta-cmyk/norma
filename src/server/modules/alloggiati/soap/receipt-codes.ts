import type { EsitoServizio } from "./errors";

/**
 * Codice errore Ricevuta osservato sul sistema REALE (Gate #0, 2026-06-01):
 * giorno passato interrogabile ma nessuna ricevuta/PDF disponibile (zero acquisizioni o non ancora generata).
 */
export const RICEVUTA_ERRORE_RECUPERO = "ERRORE_RECUPERO_RICEVUTA";

/** Vero se la Ricevuta non è recuperabile per assenza dati (≠ errore auth/token). */
export function isReceiptUnavailable(esito: EsitoServizio): boolean {
  const cod = esito.errorCod?.toUpperCase() ?? "";
  const des = esito.errorDes?.toUpperCase() ?? "";
  return cod === RICEVUTA_ERRORE_RECUPERO || des.includes("ERRORE_RECUPERO_RICEVUTA");
}
