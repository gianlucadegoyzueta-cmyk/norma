// Macchina a stati della DICHIARAZIONE periodica della tassa di soggiorno. PURA.
//
// DRAFT → READY → SUBMITTED → PAID. Annullabile (CANCELLED) finché non è inviata.
// PAID e CANCELLED sono terminali. Rispecchia l'enum Prisma TaxDeclarationStatus.

import type { TaxDeclarationStatus } from "@prisma/client";

const ALLOWED: Record<TaxDeclarationStatus, readonly TaxDeclarationStatus[]> = {
  DRAFT: ["READY", "CANCELLED"], // in costruzione: si congela o si annulla
  READY: ["SUBMITTED", "DRAFT", "CANCELLED"], // pronta: invia, o torna in bozza per ricalcolo
  SUBMITTED: ["PAID"], // inviata: resta da confermare il pagamento
  PAID: [], // terminale
  CANCELLED: [], // terminale
};

export function isValidDeclarationTransition(
  from: TaxDeclarationStatus,
  to: TaxDeclarationStatus,
): boolean {
  return ALLOWED[from].includes(to);
}

export function isDeclarationTerminal(status: TaxDeclarationStatus): boolean {
  return ALLOWED[status].length === 0;
}

export class InvalidDeclarationTransitionError extends Error {
  constructor(
    readonly from: TaxDeclarationStatus,
    readonly to: TaxDeclarationStatus,
  ) {
    super(`Transizione dichiarazione non valida: ${from} → ${to}`);
    this.name = "InvalidDeclarationTransitionError";
  }
}

export function assertValidDeclarationTransition(
  from: TaxDeclarationStatus,
  to: TaxDeclarationStatus,
): void {
  if (!isValidDeclarationTransition(from, to)) {
    throw new InvalidDeclarationTransitionError(from, to);
  }
}

/** Ricalcolabile (ri-aggregazione dei soggiorni) solo finché è modificabile. */
export function isDeclarationRecomputable(status: TaxDeclarationStatus): boolean {
  return status === "DRAFT" || status === "READY";
}
