import type { MembershipRole } from "@prisma/client";
import type { OrgMembership } from "./repository";

/** L'utente autenticato non appartiene ad alcuna Organization. */
export class NoOrganizationError extends Error {
  constructor(message = "L'utente non appartiene a nessuna Organization.") {
    super(message);
    this.name = "NoOrganizationError";
  }
}

/** L'utente ha richiesto/acceduto a un'Organization di cui NON è membro (violazione di isolamento). */
export class ForbiddenOrganizationError extends Error {
  constructor(message = "Accesso all'Organization non consentito.") {
    super(message);
    this.name = "ForbiddenOrganizationError";
  }
}

export interface CurrentOrganization {
  organizationId: string;
  organizationName: string;
  role: MembershipRole;
}

/**
 * Risolve l'Organization "corrente" di un utente — è il punto in cui si garantisce l'ISOLAMENTO:
 *  - se `requestedOrgId` è indicato, DEVE essere tra le membership dell'utente, altrimenti
 *    ForbiddenOrganizationError (così non si possono mai vedere dati di un'altra Org);
 *  - altrimenti si usa la prima membership (default);
 *  - se l'utente non ha membership → NoOrganizationError.
 *
 * Pura: nessun accesso a DB/sessione. Le membership arrivano già caricate.
 */
export function resolveCurrentOrganization(
  memberships: readonly OrgMembership[],
  requestedOrgId?: string | null,
): CurrentOrganization {
  if (memberships.length === 0) {
    throw new NoOrganizationError();
  }
  if (requestedOrgId) {
    const found = memberships.find((m) => m.organizationId === requestedOrgId);
    if (!found) {
      throw new ForbiddenOrganizationError(`Accesso negato all'Organization "${requestedOrgId}".`);
    }
    return found;
  }
  return memberships[0];
}

export function hasRole(role: MembershipRole, allowed: readonly MembershipRole[]): boolean {
  return allowed.includes(role);
}

export function assertRole(role: MembershipRole, allowed: readonly MembershipRole[]): void {
  if (!hasRole(role, allowed)) {
    throw new ForbiddenOrganizationError(`Ruolo "${role}" non autorizzato per questa azione.`);
  }
}
