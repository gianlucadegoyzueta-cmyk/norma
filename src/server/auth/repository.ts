import type { MembershipRole } from "@prisma/client";

/** Appartenenza di un utente a un'Organization (con ruolo). */
export interface OrgMembership {
  organizationId: string;
  organizationName: string;
  role: MembershipRole;
}

/** Operazioni minime per il provisioning al primo accesso. */
export interface AuthProvisioningRepository {
  countMembershipsForUser(userId: string): Promise<number>;
  /** Crea una Organization + Membership OWNER per l'utente, in modo atomico. */
  createPersonalOrganization(userId: string, name: string): Promise<{ organizationId: string }>;
}

/** Repository per l'auth: provisioning + lettura delle Organization dell'utente. */
export interface AuthRepository extends AuthProvisioningRepository {
  listOrganizationsForUser(userId: string): Promise<OrgMembership[]>;
}
