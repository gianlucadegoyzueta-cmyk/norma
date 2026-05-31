// PORT: lettura della RICEVUTA di acquisizione di un dato giorno (per la riconciliazione T+1).
//
// Perché un port a sé: il metodo WS `Ricevuta` restituisce un PDF il cui CONTENUTO/STRUTTURA
// NON sono documentati [VERIFICATO: docs/architettura §1.3 — "PDF, parsing fragile [SUPPOSIZIONE]"].
// L'estrazione dei nominativi dal PDF è quindi il pezzo più incerto del flusso: lo isoliamo dietro
// questa interfaccia così che:
//   - la LOGICA di riconciliazione (SchedinaReconcileService) sia reale, pura e testabile;
//   - l'adapter che parsa davvero il PDF reale possa essere implementato/sostituito senza toccare
//     il dominio (e, finché il formato non è confermato, resti l'unico punto "fragile").
//
// ⚠️ NON esiste ancora un adapter di PRODUZIONE: il formato del PDF reale va prima verificato sul
// campo. Nei test, un adapter mock-backed (vedi __tests__/mocks) implementa questo contratto.

import type { RecordIdentity } from "../domain/tracciato";

/** Un'identità che risulta ACQUISITA sulla ricevuta di un giorno (nominativo + data di nascita). */
export type AcquiredIdentity = RecordIdentity;

export interface AcquisitionReceiptReader {
  /**
   * Identità acquisite per una credenziale in un dato giorno (ISO "YYYY-MM-DD").
   * ⚠️ Vincolo reale: SOLO giorni PASSATI — il giorno corrente non è interrogabile (lo impone
   * il web service). L'implementazione deve propagare/segnalare il rifiuto, non inventare dati.
   */
  acquiredOn(credentialId: string, dateIso: string): Promise<AcquiredIdentity[]>;
}
