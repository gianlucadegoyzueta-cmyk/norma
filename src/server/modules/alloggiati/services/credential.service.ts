import type { CredentialCategory } from "@prisma/client";
import type { AlloggiatiSecret, SecretsVault } from "../../../secrets";
import type {
  CredentialMetadata,
  PrismaCredentialRepository,
} from "../adapters/PrismaCredentialRepository";

export interface OnboardCredentialInput {
  organizationId: string;
  label: string;
  category: CredentialCategory;
  provincia: string;
  /** utente/password/wskey di Alloggiati: finiscono SOLO nel vault. */
  secret: AlloggiatiSecret;
}

/**
 * Onboarding di una credenziale Alloggiati.
 * I segreti vengono salvati SOLO nel vault; nel DB finisce il riferimento opaco
 * (secretRef). Mai segreti in chiaro nel database.
 *
 * Lo stato iniziale è PENDING_REONBOARDING: diventerà ACTIVE dopo il primo
 * Authentication_Test riuscito (parte di rete, futura).
 */
export class CredentialService {
  constructor(
    private readonly repo: PrismaCredentialRepository,
    private readonly vault: SecretsVault,
  ) {}

  async onboard(input: OnboardCredentialInput): Promise<CredentialMetadata> {
    const secretRef = await this.vault.store(input.secret);
    try {
      return await this.repo.create({
        organizationId: input.organizationId,
        label: input.label,
        category: input.category,
        provincia: input.provincia,
        secretRef,
        status: "PENDING_REONBOARDING",
      });
    } catch (e) {
      // se l'insert nel DB fallisce, non lasciare segreti orfani nel vault
      await this.vault.delete(secretRef).catch(() => undefined);
      throw e;
    }
  }
}
