import type { PrismaClient } from "@prisma/client";
import { PrismaCredentialRepository } from "../../alloggiati";
import type { CredentialLookup } from "../ports";

/**
 * Adapter di `CredentialLookup` sopra il repository Alloggiati. Espone solo i campi che servono
 * a `PropertiesService` (id, org, provincia, etichetta); i segreti non passano mai da qui.
 */
export class PrismaCredentialLookup implements CredentialLookup {
  private readonly repo: PrismaCredentialRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new PrismaCredentialRepository(prisma);
  }

  async get(credentialId: string, organizationId: string) {
    const c = await this.repo.getById(credentialId, organizationId);
    if (!c) return null;
    return {
      id: c.id,
      organizationId: c.organizationId,
      provincia: c.provincia,
      label: c.label,
    };
  }
}
