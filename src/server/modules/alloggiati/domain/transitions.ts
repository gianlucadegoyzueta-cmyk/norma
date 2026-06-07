import { SchedinaStatus } from "@prisma/client";
import type { SendAttempt } from "./types";

/**
 * Grafo delle transizioni AMMESSE dell'outbox delle schedine.
 * È la macchina a stati che protegge l'invariante più importante del prodotto:
 * non si può "tornare indietro" da un'acquisizione (su Alloggiati è irreversibile).
 */
const ALLOWED: Record<SchedinaStatus, readonly SchedinaStatus[]> = {
  // Da PENDING: invio normale, OPPURE parcheggio in NEEDS_REVIEW se i tentativi sono esauriti.
  PENDING: [SchedinaStatus.SENDING, SchedinaStatus.NEEDS_REVIEW],
  SENDING: [SchedinaStatus.ACQUIRED, SchedinaStatus.REJECTED, SchedinaStatus.UNVERIFIED],
  ACQUIRED: [], // terminale: l'acquisizione è IRREVERSIBILE
  REJECTED: [SchedinaStatus.PENDING], // dopo la correzione si ri-accoda
  UNVERIFIED: [SchedinaStatus.ACQUIRED, SchedinaStatus.PENDING], // dopo la riconciliazione T+1
  // Esauriti i tentativi automatici: l'host risolve e la rimette in coda (con reset dei tentativi).
  NEEDS_REVIEW: [SchedinaStatus.PENDING],
};

export function isValidTransition(from: SchedinaStatus, to: SchedinaStatus): boolean {
  return ALLOWED[from].includes(to);
}

export function isTerminal(status: SchedinaStatus): boolean {
  return ALLOWED[status].length === 0;
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: SchedinaStatus,
    readonly to: SchedinaStatus,
  ) {
    super(`Transizione di stato non valida: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/** Lancia InvalidTransitionError se la transizione non è ammessa. */
export function assertValidTransition(from: SchedinaStatus, to: SchedinaStatus): void {
  if (!isValidTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

/** Esito di una decisione di stato + eventuali dettagli di errore da persistere. */
export interface StatusDecision {
  status: SchedinaStatus;
  errorCod: string | null;
  errorDes: string | null;
}

/**
 * Dato l'esito di un tentativo di invio (mentre la schedina è in SENDING),
 * decide il nuovo stato. PURA: nessuna rete, nessun database.
 *  - ACQUIRED    → acquisita
 *  - REJECTED    → scartata (con codice/descrizione errore), correggibile
 *  - NO_RESPONSE → UNVERIFIED (esito ignoto: si riconcilia a T+1, mai doppio invio)
 */
export function decideFromSendAttempt(attempt: SendAttempt): StatusDecision {
  switch (attempt.kind) {
    case "ACQUIRED":
      return { status: SchedinaStatus.ACQUIRED, errorCod: null, errorDes: null };
    case "REJECTED":
      return {
        status: SchedinaStatus.REJECTED,
        errorCod: attempt.errorCod ?? null,
        errorDes: attempt.errorDes ?? null,
      };
    case "NO_RESPONSE":
      return { status: SchedinaStatus.UNVERIFIED, errorCod: null, errorDes: null };
  }
}
