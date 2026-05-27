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

  async getById(id: string): Promise<CredentialMetadata | null> {
    return this.prisma.alloggiatiCredential.findUnique({ where: { id }, select: SELECT });
  }

  async listByOrganization(organizationId: string): Promise<CredentialMetadata[]> {
    return this.prisma.alloggiatiCredential.findMany({ where: { organizationId }, select: SELECT });
  }

  async updateStatus(id: string, status: CredentialStatus): Promise<void> {
    await this.prisma.alloggiatiCredential.update({ where: { id }, data: { status } });
  }

  /** Da chiamare dopo un Authentication_Test andato a buon fine. */
  async markVerified(id: string): Promise<void> {
    await this.prisma.alloggiatiCredential.update({
      where: { id },
      data: { status: "ACTIVE", lastVerifiedAt: new Date() },
    });
  }
}
