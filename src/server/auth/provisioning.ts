import type { AuthProvisioningRepository } from "./repository";

/** Nome di default per la prima Organization, derivato dall'email. */
export function defaultOrganizationName(email: string): string {
  const local = email.split("@")[0]?.trim();
  return local ? `Organizzazione di ${local}` : "La mia Organizzazione";
}

/**
 * Provisioning al PRIMO accesso: se l'utente non ha ancora membership, crea una sua Organization
 * con Membership OWNER. Idempotente (se ha già membership non fa nulla), così è sicuro anche se
 * viene richiamato più volte.
 *
 * Chiamato dall'evento `createUser` di Auth.js (che scatta quando l'adapter crea un nuovo utente).
 */
export async function provisionNewUser(
  user: { id: string; email?: string | null },
  repo: AuthProvisioningRepository,
): Promise<void> {
  const existing = await repo.countMembershipsForUser(user.id);
  if (existing > 0) return;
  await repo.createPersonalOrganization(user.id, defaultOrganizationName(user.email ?? ""));
}
