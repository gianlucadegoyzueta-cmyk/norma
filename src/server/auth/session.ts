import { cookies } from "next/headers";
import { auth } from "../../auth";
import { prisma } from "../db";
import { type CurrentOrganization, resolveCurrentOrganization } from "./access";
import { PrismaAuthRepository } from "./adapters/PrismaAuthRepository";
import type { OrgMembership } from "./repository";

export const CURRENT_ORG_COOKIE = "current-org";

export interface AuthContext {
  user: { id: string; email: string | null; name: string | null };
  current: CurrentOrganization;
  organizations: OrgMembership[];
}

/**
 * Recupera la sessione + l'Organization corrente, con ISOLAMENTO:
 *  - legge la sessione (server-side; con strategia JWT è validata per firma sul cookie);
 *  - carica SEMPRE le Organization dell'utente DAL DB (non dal token): è qui che si garantisce
 *    l'isolamento, a prescindere da cosa contenga il token;
 *  - applica il cookie di "Org corrente" se valido, altrimenti la prima (un cookie che punta
 *    a un'Org non più sua viene ignorato → mai dati di altre Org).
 * Restituisce null se non autenticato.
 */
export async function getCurrentContext(): Promise<AuthContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const repo = new PrismaAuthRepository(prisma);
  const organizations = await repo.listOrganizationsForUser(session.user.id);

  const requested = (await cookies()).get(CURRENT_ORG_COOKIE)?.value ?? null;
  let current: CurrentOrganization;
  try {
    current = resolveCurrentOrganization(organizations, requested);
  } catch {
    // cookie non valido (Org non più dell'utente) → ripiega sulla prima Org
    current = resolveCurrentOrganization(organizations);
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? null,
      name: session.user.name ?? null,
    },
    current,
    organizations,
  };
}
