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
 * Nome dell'Organization, in ordine di preferenza:
 *  1. `organizationName` esplicito (es. il "nome azienda" scelto in registrazione) → il prodotto
 *     non mostra più "Organizzazione di mario";
 *  2. fallback derivato dall'email, solo come ultima risorsa (es. Google senza nome azienda →
 *     il nome reale lo si chiede poi nel primo step del wizard).
 *
 * Chiamato dall'evento `createUser` di Auth.js (Google) e, in modo esplicito con nome,
 * dalla server action di registrazione email+password.
 */
export async function provisionNewUser(
  user: { id: string; email?: string | null; organizationName?: string | null },
  repo: AuthProvisioningRepository,
): Promise<void> {
  const existing = await repo.countMembershipsForUser(user.id);
  if (existing > 0) return;
  const explicit = user.organizationName?.trim();
  const name =
    explicit && explicit.length > 0 ? explicit : defaultOrganizationName(user.email ?? "");
  await repo.createPersonalOrganization(user.id, name);
}
