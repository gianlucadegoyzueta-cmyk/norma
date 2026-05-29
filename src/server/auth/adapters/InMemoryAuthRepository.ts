import type { MembershipRole } from "@prisma/client";
import type { AuthRepository, OrgMembership } from "../repository";

interface OrgRow {
  id: string;
  name: string;
}
interface MemRow {
  userId: string;
  organizationId: string;
  role: MembershipRole;
}

/** Repository auth IN MEMORIA per i test (niente DB). */
export class InMemoryAuthRepository implements AuthRepository {
  private readonly orgs: OrgRow[] = [];
  private readonly mems: MemRow[] = [];
  private seq = 0;

  async countMembershipsForUser(userId: string): Promise<number> {
    return this.mems.filter((m) => m.userId === userId).length;
  }

  async createPersonalOrganization(
    userId: string,
    name: string,
  ): Promise<{ organizationId: string }> {
    const id = `org_${++this.seq}`;
    this.orgs.push({ id, name });
    this.mems.push({ userId, organizationId: id, role: "OWNER" });
    return { organizationId: id };
  }

  async listOrganizationsForUser(userId: string): Promise<OrgMembership[]> {
    return this.mems
      .filter((m) => m.userId === userId)
      .map((m) => ({
        organizationId: m.organizationId,
        organizationName: this.orgs.find((o) => o.id === m.organizationId)?.name ?? "",
        role: m.role,
      }));
  }

  /** Helper per i test: aggiunge una membership arbitraria (es. simulare multi-org o altri utenti). */
  addMembership(
    userId: string,
    organizationId: string,
    organizationName: string,
    role: MembershipRole,
  ): void {
    if (!this.orgs.some((o) => o.id === organizationId)) {
      this.orgs.push({ id: organizationId, name: organizationName });
    }
    this.mems.push({ userId, organizationId, role });
  }
}
