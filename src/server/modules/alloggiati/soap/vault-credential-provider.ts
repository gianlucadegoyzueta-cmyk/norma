import type { AlloggiatiSecret, SecretsVault } from "../../../secrets";
import type { AlloggiatiCredentialProvider } from "./token-manager";

/** Minimo che serve dal repository credenziali: dal credentialId al riferimento del vault. */
export interface CredentialRefReader {
  getById(id: string): Promise<{ secretRef: string } | null>;
}

/**
 * Provider reale: credentialId → secretRef (repository) → segreti (vault).
 * I segreti (utente/password/wskey) non compaiono mai in chiaro nel codice né nel DB.
 */
export class VaultCredentialProvider implements AlloggiatiCredentialProvider {
  constructor(
    private readonly credentials: CredentialRefReader,
    private readonly vault: SecretsVault,
  ) {}

  async getSecret(credentialId: string): Promise<AlloggiatiSecret> {
    const meta = await this.credentials.getById(credentialId);
    if (!meta) {
      throw new Error(`Credenziale Alloggiati non trovata: ${credentialId}`);
    }
    return this.vault.retrieve(meta.secretRef);
  }
}
