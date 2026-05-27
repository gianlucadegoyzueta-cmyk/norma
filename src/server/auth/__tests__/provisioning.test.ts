import { describe, expect, it } from "vitest";
import { InMemoryAuthRepository } from "../adapters/InMemoryAuthRepository";
import { defaultOrganizationName, provisionNewUser } from "../provisioning";

describe("defaultOrganizationName", () => {
  it("deriva il nome dall'email", () => {
    expect(defaultOrganizationName("mario@example.com")).toBe("Organizzazione di mario");
  });
  it("fallback se l'email è vuota", () => {
    expect(defaultOrganizationName("")).toBe("La mia Organizzazione");
  });
});

describe("provisionNewUser", () => {
  it("al primo accesso crea una Organization con Membership OWNER", async () => {
    const repo = new InMemoryAuthRepository();
    await provisionNewUser({ id: "user_1", email: "mario@example.com" }, repo);
    const orgs = await repo.listOrganizationsForUser("user_1");
    expect(orgs).toHaveLength(1);
    expect(orgs[0].role).toBe("OWNER");
    expect(orgs[0].organizationName).toBe("Organizzazione di mario");
  });

  it("è idempotente: se l'utente ha già una Org non ne crea un'altra", async () => {
    const repo = new InMemoryAuthRepository();
    await provisionNewUser({ id: "user_1", email: "mario@example.com" }, repo);
    await provisionNewUser({ id: "user_1", email: "mario@example.com" }, repo);
    expect(await repo.countMembershipsForUser("user_1")).toBe(1);
  });
});
