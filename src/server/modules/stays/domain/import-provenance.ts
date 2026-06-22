import type { ReservationSource, StayImportStatus } from "@prisma/client";

// Presentazione PURA della provenienza/stato di import di un soggiorno per la lista `/stays`.
// Niente I/O: trasforma i due campi additivi (importSource, importStatus) in un'etichetta di
// origine e in un eventuale "richiamo" di attenzione quando l'automazione ha segnalato qualcosa
// (prenotazione annullata dal feed, o annullamento da verificare perché l'host aveva già inserito
// gli ospiti). Coerente con i badge mostrati nella pagina dell'immobile.

/** Stato di rilievo di un soggiorno importato, già pronto per un badge in lista. */
export type ImportNotice =
  | { kind: "cancelled" }
  | { kind: "needs-cancel-review" }
  | { kind: "draft-empty" };

export interface StayImportProvenance {
  /** Etichetta della piattaforma di origine ("Airbnb", "Booking.com", …) o null se a mano. */
  sourceLabel: string | null;
  /** Eventuale richiamo da mostrare in lista; null se non c'è nulla di rilevante. */
  notice: ImportNotice | null;
}

/** Etichetta leggibile della piattaforma di origine. (Duplicata qui per non accoppiare i moduli.) */
function labelOf(source: ReservationSource): string {
  switch (source) {
    case "AIRBNB":
      return "Airbnb";
    case "BOOKING":
      return "Booking.com";
    case "VRBO":
      return "VRBO";
    case "OTHER":
      return "Altro calendario";
  }
}

/**
 * Deriva la provenienza per la lista soggiorni.
 *  - soggiorno NON importato (entrambi i campi null) → nessuna etichetta, nessun richiamo;
 *  - importato → etichetta della piattaforma + eventuale richiamo:
 *      · CANCELLED            → annullata dal feed;
 *      · NEEDS_CANCEL_REVIEW  → sparita dal feed ma con ospiti già inseriti (verifica);
 *      · DRAFT senza ospiti   → bozza da completare (così l'host sa che manca un passo);
 *      · DRAFT con ospiti      → nessun richiamo (è in carreggiata).
 */
export function deriveImportProvenance(input: {
  importSource: ReservationSource | null;
  importStatus: StayImportStatus | null;
  guestsAdded: number;
}): StayImportProvenance {
  const imported = input.importStatus !== null || input.importSource !== null;
  if (!imported) return { sourceLabel: null, notice: null };

  const sourceLabel = input.importSource ? labelOf(input.importSource) : "iCal";

  let notice: ImportNotice | null = null;
  if (input.importStatus === "CANCELLED") {
    notice = { kind: "cancelled" };
  } else if (input.importStatus === "NEEDS_CANCEL_REVIEW") {
    notice = { kind: "needs-cancel-review" };
  } else if (input.importStatus === "DRAFT" && input.guestsAdded === 0) {
    notice = { kind: "draft-empty" };
  }

  return { sourceLabel, notice };
}
