import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockRedirect, mockSetCookie, mockGetCurrentContext } = vi.hoisted(() => ({
  mockRedirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  mockSetCookie: vi.fn(),
  mockGetCurrentContext: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mockSetCookie }),
}));
vi.mock("@/server/auth/session", () => ({
  CURRENT_ORG_COOKIE: "current-org",
  getCurrentContext: mockGetCurrentContext,
}));

import { switchOrganizationAction } from "../switch-organization-action";

function buildFormData(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(k, v);
  return fd;
}

describe("switchOrganizationAction", () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockSetCookie.mockClear();
    mockGetCurrentContext.mockReset();
  });

  it("sets cookie and redirects when org is allowed", async () => {
    mockGetCurrentContext.mockResolvedValue({
      user: { id: "u1", email: "x@example.com", name: "X" },
      current: { organizationId: "org_a", organizationName: "Org A", role: "OWNER" },
      organizations: [
        { organizationId: "org_a", organizationName: "Org A", role: "OWNER" },
        { organizationId: "org_b", organizationName: "Org B", role: "ADMIN" },
      ],
    });
    const fd = buildFormData({ organizationId: "org_b", returnTo: "/dashboard/clients" });
    await expect(switchOrganizationAction(fd)).rejects.toThrow("REDIRECT:/dashboard/clients");
    expect(mockSetCookie).toHaveBeenCalledWith(
      "current-org",
      "org_b",
      expect.objectContaining({ httpOnly: true, sameSite: "lax", path: "/" }),
    );
  });

  it("does not set cookie for unauthorized org", async () => {
    mockGetCurrentContext.mockResolvedValue({
      user: { id: "u1", email: "x@example.com", name: "X" },
      current: { organizationId: "org_a", organizationName: "Org A", role: "OWNER" },
      organizations: [{ organizationId: "org_a", organizationName: "Org A", role: "OWNER" }],
    });
    const fd = buildFormData({ organizationId: "org_x", returnTo: "/dashboard/clients" });
    await expect(switchOrganizationAction(fd)).rejects.toThrow("REDIRECT:/dashboard/clients");
    expect(mockSetCookie).not.toHaveBeenCalled();
  });
});
