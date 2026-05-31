import type { SchedinaStatus } from "@prisma/client";

/**
 * Stati "aperti" di una schedina: ancora nel flusso d'invio e quindi soggetti a scadenza.
 * Definizione UNICA e condivisa (prima viveva solo dentro isOverdue in /schedine), riusata sia
 * dalla pagina schedine sia dal conteggio "oltre scadenza" della dashboard.
 *
 * REJECTED è esclusa di proposito: è in attesa di correzione manuale, non in coda d'invio.
 * ACQUIRED è terminale.
 */
export const OPEN_SCHEDINA_STATUSES: SchedinaStatus[] = ["PENDING", "SENDING", "UNVERIFIED"];

export function isOpenStatus(status: SchedinaStatus): boolean {
  return OPEN_SCHEDINA_STATUSES.includes(status);
}

/** Una schedina "aperta" la cui deadline è già passata è in ritardo (overdue). */
export function isOverdue(
  s: { status: SchedinaStatus; deadlineAt: Date },
  now: number = Date.now(),
): boolean {
  return isOpenStatus(s.status) && s.deadlineAt.getTime() < now;
}
