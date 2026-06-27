import { describe, expect, it } from "vitest";
import { createTeamInviteToken, verifyTeamInviteToken } from "../invite-token";

const SECRET = "test-secret";

describe("team invite token", () => {
  it("roundtrip sign/verify", () => {
    const token = createTeamInviteToken(
      {
        orgId: "org_1",
        orgName: "Org Uno",
        email: "USER@Example.com",
        role: "ADMIN",
        invitedBy: "u_owner",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      SECRET,
    );
    const payload = verifyTeamInviteToken(token, SECRET);
    expect(payload).not.toBeNull();
    expect(payload?.email).toBe("user@example.com");
    expect(payload?.role).toBe("ADMIN");
  });

  it("rejects tampered token", () => {
    const token = createTeamInviteToken(
      {
        orgId: "org_1",
        orgName: "Org Uno",
        email: "user@example.com",
        role: "MEMBER",
        invitedBy: "u_owner",
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      SECRET,
    );
    const [body] = token.split(".");
    const tampered = `${body}.invalidsig`;
    expect(verifyTeamInviteToken(tampered, SECRET)).toBeNull();
  });

  it("rejects expired token", () => {
    const token = createTeamInviteToken(
      {
        orgId: "org_1",
        orgName: "Org Uno",
        email: "user@example.com",
        role: "MEMBER",
        invitedBy: "u_owner",
        iat: 1_700_000_000,
        exp: 1_700_000_010,
      },
      SECRET,
    );
    expect(verifyTeamInviteToken(token, SECRET)).toBeNull();
  });
});
