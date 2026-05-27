import { describe, expect, it } from "vitest";
import {
  ForbiddenOrganizationError,
  NoOrganizationError,
  assertRole,
  hasRole,
  resolveCurrentOrganization,
} from "../access";
import type { OrgMembership } from "../repository";

const orgA: OrgMembership = { organizationId: "org_a", organizationName: "A", role: "OWNER" };
const orgB: OrgMembership = { organizationId: "org_b", organizationName: "B", role: "MEMBER" };

describe("resolveCurrentOrganization", () => {
  it("senza membership → NoOrganizationError", () => {
    expect(() => resolveCurrentOrganization([])).toThrow(NoOrganizationError);
  });

  it("senza Org richiesta → default alla prima", () => {
    expect(resolveCurrentOrganization([orgA, orgB]).organizationId).toBe("org_a");
  });

  it("Org richiesta di cui è membro → la restituisce con il ruolo", () => {
    const current = resolveCurrentOrganization([orgA, orgB], "org_b");
    expect(current.organizationId).toBe("org_b");
    expect(current.role).toBe("MEMBER");
  });

  it("ISOLAMENTO: Org richiesta di cui NON è membro → ForbiddenOrganizationError", () => {
    expect(() => resolveCurrentOrganization([orgA], "org_b")).toThrow(ForbiddenOrganizationError);
  });

  it("ISOLAMENTO: due utenti vedono solo le proprie Org", () => {
    const userA: OrgMembership[] = [orgA];
    const userB: OrgMembership[] = [orgB];
    expect(() => resolveCurrentOrganization(userA, "org_b")).toThrow(ForbiddenOrganizationError);
    expect(() => resolveCurrentOrganization(userB, "org_a")).toThrow(ForbiddenOrganizationError);
  });
});

describe("hasRole / assertRole", () => {
  it("hasRole verifica l'appartenenza al set di ruoli", () => {
    expect(hasRole("OWNER", ["OWNER", "ADMIN"])).toBe(true);
    expect(hasRole("MEMBER", ["OWNER", "ADMIN"])).toBe(false);
  });
  it("assertRole lancia se il ruolo non è autorizzato", () => {
    expect(() => assertRole("MEMBER", ["OWNER"])).toThrow(ForbiddenOrganizationError);
    expect(() => assertRole("OWNER", ["OWNER"])).not.toThrow();
  });
});
