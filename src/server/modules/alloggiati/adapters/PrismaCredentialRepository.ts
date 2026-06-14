import { Prisma } from "@prisma/client";
import type { CredentialCategory, CredentialStatus, PrismaClient } from "@prisma/client";

export interface CredentialMetadata {
  id: string;
  organizationId: string;
  label: string;
  category: CredentialCategory;
  provincia: string;
  status: CredentialStatus;
  secretRef: string;
}

export interface CreateCredentialRow {
  organizationId: string;
  label: string;
  category: CredentialCategory;
  provincia: string;
  secretRef: string;
  status?: CredentialStatus;
}

const SELECT = {
  id: true,
  organizationId: true,
  label: true,
  category: true,
  provincia: true,
  status: true,
  secretRef: true,
} satisfies Prisma.AlloggiatiCredentialSelect;

/**
 * Adapter Prisma per le credenziali Alloggiati. Conserva SOLO metadati e il
 * riferimento al vault (secretRef); i segreti veri non passano mai da qui.
 */
export class PrismaCredentialRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(row: CreateCredentialRow): Promise<CredentialMetadata> {
    return this.prisma.alloggiatiCredential.create({ data: row, select: SELECT });
  }

  async getById(id: string, organizationId: string): Promise<CredentialMetadata | null> {
    // findFirst con (id, organizationId): una credenziale di un'altra org → null. Isolamento
    // garantito dalla query, non dal chiamante.
    return this.prisma.alloggiatiCredential.findFirst({
      where: { id, organizationId },
      select: SELECT,
    });
  }

  /**
   * Lettura INTERNA per il provider del vault: dal credentialId al solo `secretRef` opaco.
   * NON filtra per organizationId perché è invocata DENTRO il flusso di invio, che è già
   * autorizzato a monte (`guardCredential` esegue `getById(id, org)` prima di procedere).
   * Restituisce solo il riferimento opaco al vault, mai metadati o segreti di tenant.
   */
  async findSecretRef(id: string): Promise<{ secretRef: string } | null> {
    return this.prisma.alloggiatiCredential.findUnique({
      where: { id },
      select: { secretRef: true },
    });
  }

  async listByOrganization(organizationId: string): Promise<CredentialMetadata[]> {
    return this.prisma.alloggiatiCredential.findMany({ where: { organizationId }, select: SELECT });
  }

  /**
   * Tutti gli id delle credenziali ATTIVE, di OGNI organizzazione. Lettura INTERNA per i job di
   * sistema (es. lo scheduler invio+reconcile): non c'è un'org chiamante, l'autorizzazione è il
   * contesto di sistema del cron. Ritorna solo gli id (nessun metadato/segreto di tenant).
   */
  async listActiveCredentialIds(): Promise<string[]> {
    const rows = await this.prisma.alloggiatiCredential.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => r.id);
  }

  /** Credenziali ATTIVE con opt-in all'auto-invio (autoSend=true): le sole che il cron auto-invia. */
  async listAutoSendCredentialIds(): Promise<string[]> {
    const rows = await this.prisma.alloggiatiCredential.findMany({
      where: { status: "ACTIVE", autoSend: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => r.id);
  }

  async updateStatus(id: string, organizationId: string, status: CredentialStatus): Promise<void> {
    // updateMany con (id, organizationId): una credenziale di un'altra org non viene aggiornata
    // (0 righe), mai un'eccezione e mai una scrittura cross-tenant. Isolamento by query.
    await this.prisma.alloggiatiCredential.updateMany({
      where: { id, organizationId },
      data: { status },
    });
  }

  /** Da chiamare dopo un Authentication_Test andato a buon fine. */
  async markVerified(id: string, organizationId: string): Promise<void> {
    await this.prisma.alloggiatiCredential.updateMany({
      where: { id, organizationId },
      data: { status: "ACTIVE", lastVerifiedAt: new Date() },
    });
  }
}
