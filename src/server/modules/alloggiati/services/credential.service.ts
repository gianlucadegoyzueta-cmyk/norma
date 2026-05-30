import type { CredentialCategory, CredentialStatus } from "@prisma/client";
import type { AlloggiatiSecret, SecretsVault } from "../../../secrets";
import type {
  CredentialMetadata,
  PrismaCredentialRepository,
} from "../adapters/PrismaCredentialRepository";
import { AlloggiatiAuthError } from "../soap/errors";

/** Minimo per verificare una credenziale contro Alloggiati. Lo soddisfa `AlloggiatiSoapClient`. */
export interface CredentialVerifyClient {
  generateToken(secret: AlloggiatiSecret): Promise<{ utente: string; token: string }>;
  authenticationTest(utente: string, token: string): Promise<void>;
}

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
    private readonly client: CredentialVerifyClient,
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

  /**
   * Verifica la credenziale CONTRO il sistema reale: GenerateToken → Authentication_Test.
   * NON invia nulla (nessun Send). Aggiorna lo stato:
   *  - ACTIVE se le credenziali sono valide;
   *  - INVALID se vengono rifiutate (AlloggiatiAuthError);
   *  - su errore TRANSITORIO (rete/protocollo) RILANCIA: lo stato resta PENDING_REONBOARDING e
   *    il chiamante mostra l'errore (riprovabile più tardi).
   */
  async verify(credentialId: string, organizationId: string): Promise<CredentialStatus> {
    const cred = await this.repo.getById(credentialId, organizationId);
    if (!cred) throw new Error(`Credenziale non trovata: ${credentialId}`);
    const secret = await this.vault.retrieve(cred.secretRef);
    try {
      const { utente, token } = await this.client.generateToken(secret);
      await this.client.authenticationTest(utente, token);
      await this.repo.markVerified(credentialId);
      return "ACTIVE";
    } catch (e) {
      if (e instanceof AlloggiatiAuthError) {
        await this.repo.updateStatus(credentialId, "INVALID");
        return "INVALID";
      }
      throw e;
    }
  }
}
