// DOMINIO PURO: la "prontezza all'invio" ISTAT di una struttura per un periodo.
//
// È la superficie dell'AUTO-PREP: data la regione (routing) e l'esito della preparazione del tracciato
// (OK / INCOMPLETE con i campi mancanti), dice in UNO stato leggibile se la struttura è pronta, cosa
// manca, e se l'invio AUTO è anche solo possibile (canale implementato vs stub). Nessun I/O qui: il
// loader a monte fa le query e passa gli input già risolti — questo modulo è unit-testabile senza DB.
//
// Disciplina "mai promettere invii inesistenti": `canAutoSubmit` è true SOLO se il canale è davvero
// operativo (isImplemented). Con gli stub odierni è sempre false → l'invio reale resta un gate umano.

import type { RegionMovement, RegionSerializerId } from "../regional/routing";

/** Esito minimo che un loader regionale (Ross1000/SPOT/Umbria) espone alla prontezza. */
export type RegionalPreparation =
  | { kind: "OK" }
  | { kind: "INCOMPLETE"; missing: readonly { field: string; scope?: string; refId?: string }[] };

/** Stato sintetico di prontezza di una struttura. */
export type ReadinessStatus =
  | "READY" // regione a FILE/AUTO + tracciato completo → pronto da inviare/caricare
  | "INCOMPLETE" // regione a FILE/AUTO ma mancano dati obbligatori
  | "ASSISTED" // regione senza serializer integrato → numeri pronti, inserimento manuale
  | "UNROUTED"; // provincia/comune non riconosciuto → dato struttura da sistemare

/** Etichette leggibili dei campi mancanti del tracciato (UI). Allineate a istat-reminder.service. */
export const MISSING_FIELD_LABELS: Record<string, string> = {
  struttura: "struttura non configurata",
  codice: "codice struttura",
  cameredisponibili: "camere disponibili",
  lettidisponibili: "letti disponibili",
  postilettodisponibili: "posti letto disponibili",
  cittadinanza: "cittadinanza ospite",
  statoresidenza: "stato di residenza ospite",
  luogoresidenza: "luogo di residenza ospite",
  comuneresidenza: "comune di residenza ospite",
  paeseresidenza: "paese di residenza ospite",
  tipoturismo: "tipo turismo",
  mezzotrasporto: "mezzo di trasporto",
  idcapo: "capogruppo",
  leaderId: "capogruppo",
};

/** Traduce un codice campo del tracciato nell'etichetta UI (fallback: il codice grezzo). */
export function missingFieldLabel(field: string): string {
  return MISSING_FIELD_LABELS[field] ?? field;
}

export interface SubmissionReadiness {
  status: ReadinessStatus;
  /** Regione/PA risolta (null se UNROUTED). */
  region: RegionMovement | null;
  /** Serializer della regione (null se ASSISTITO o UNROUTED). */
  serializerId: RegionSerializerId | null;
  /** Campi obbligatori mancanti, già etichettati e DEDUPLICATI (solo se INCOMPLETE). */
  missingFields: readonly string[];
  /**
   * Il canale di trasmissione esiste ed è davvero operativo? Con gli stub odierni: false.
   * Decide se mostrare l'affordance "Invia" abilitata (mai abilitata finché è uno stub).
   */
  channelImplemented: boolean;
  /**
   * L'invio AUTO è possibile ORA? true SOLO se READY e canale implementato. Oggi sempre false:
   * l'invio reale a un ente resta una decisione umana esplicita (guardrail #1).
   */
  canAutoSubmit: boolean;
}

/** Verdetto del canale: lo stub è `{ implemented: false }`; un adapter reale `{ implemented: true }`. */
export interface ChannelVerdict {
  isImplemented: boolean;
}

/**
 * Calcola la prontezza di UNA struttura.
 *
 * @param region   routing della struttura (null = provincia non riconosciuta → UNROUTED).
 * @param prep     esito della preparazione del tracciato per la regione (null se ASSISTITO/UNROUTED:
 *                 nessun serializer da preparare).
 * @param channel  verdetto del canale di trasmissione (null se nessun canale → mai AUTO).
 */
export function computeSubmissionReadiness(
  region: RegionMovement | null,
  prep: RegionalPreparation | null,
  channel: ChannelVerdict | null,
): SubmissionReadiness {
  const channelImplemented = channel?.isImplemented === true;

  // Provincia/comune non riconosciuto: niente routing, niente preparazione.
  if (!region) {
    return {
      status: "UNROUTED",
      region: null,
      serializerId: null,
      missingFields: [],
      channelImplemented,
      canAutoSubmit: false,
    };
  }

  // Regione senza serializer integrato → ASSISTITO (numeri pronti, inserimento manuale).
  if (region.status === "ASSISTITO" || region.serializerId === null) {
    return {
      status: "ASSISTED",
      region,
      serializerId: null,
      missingFields: [],
      channelImplemented,
      canAutoSubmit: false,
    };
  }

  // Regione a FILE/AUTO: la prontezza dipende dall'esito della preparazione del tracciato.
  if (prep && prep.kind === "INCOMPLETE") {
    const missingFields = [...new Set(prep.missing.map((m) => missingFieldLabel(m.field)))];
    return {
      status: "INCOMPLETE",
      region,
      serializerId: region.serializerId,
      missingFields,
      channelImplemented,
      canAutoSubmit: false,
    };
  }

  // Tracciato completo → READY. L'invio AUTO è possibile solo con un canale operativo (mai uno stub).
  return {
    status: "READY",
    region,
    serializerId: region.serializerId,
    missingFields: [],
    channelImplemented,
    canAutoSubmit: channelImplemented,
  };
}
