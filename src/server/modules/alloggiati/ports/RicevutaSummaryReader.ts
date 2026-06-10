// PORT: lettura del RIEPILOGO AGGREGATO della Ricevuta di un dato giorno (riconciliazione T+1).
//
// VERDETTO Gate #0 (vedi DECISIONS D3): la Ricevuta è un documento AGGREGATO — contiene il
// CONTEGGIO delle schedine inviate nel giorno, NON i nominativi degli ospiti. La riconciliazione
// si fonda quindi sul confronto di CONTEGGI (schedine attese vs "SCHEDINE INVIATE"), non più
// sul match per-identità. Questo port sostituisce, nel servizio di reconcile, il vecchio
// `AcquisitionReceiptReader` (che resta solo per i test/mock per-identità).
//
// L'estrazione/parsing del PDF resta il punto più incerto del flusso: lo isoliamo dietro questa
// interfaccia così che la LOGICA di riconciliazione sia pura e testabile, e l'adapter reale
// (SoapRicevutaSummaryReader) possa cambiare senza toccare il dominio.

import type { RicevutaSummary } from "../domain/ricevuta-summary";

export interface RicevutaSummaryReader {
  /**
   * Riepilogo aggregato della Ricevuta per una credenziale in un dato giorno (ISO "YYYY-MM-DD").
   *
   * - Ritorna `null` quando per quel giorno NON esiste una ricevuta (es. `ERRORE_RECUPERO_RICEVUTA`:
   *   nessuna acquisizione quel giorno) → semanticamente "0 schedine inviate".
   * - ⚠️ Vincolo reale: SOLO giorni PASSATI — il giorno corrente non è interrogabile (lo impone il
   *   web service). L'implementazione deve propagare/segnalare il rifiuto, non inventare dati.
   */
  summaryOn(credentialId: string, dateIso: string): Promise<RicevutaSummary | null>;
}
