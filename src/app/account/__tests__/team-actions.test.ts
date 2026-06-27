import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockGetCurrentContext,
  mockCheckWriteAccess,
  mockSendTransactionalEmail,
  mockRevalidatePath,
  mockPrisma,
} = vi.hoisted(() => ({
  mockGetCurrentContext: vi.fn(),
  mockCheckWriteAccess: vi.fn(),
  mockSendTransactionalEmail: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockPrisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    membership: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ getCurrentContext: mockGetCurrentContext }));
vi.mock("@/server/modules/billing/write-access", () => ({
  checkWriteAccess: mockCheckWriteAccess,
}));
vi.mock("@/server/auth/email", () => ({
  appBaseUrl: () => "https://app.norma.casa",
  sendTransactionalEmail: mockSendTransactionalEmail,
}));
vi.mock("@/server/db", () => ({ prisma: mockPrisma }));

import { addTeamMemberAction } from "../actions";

describe("account team actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckWriteAccess.mockResolvedValue({ ok: true });
    mockGetCurrentContext.mockResolvedValue({
      user: { id: "u-owner", email: "owner@norma.casa", name: "Owner" },
      current: { organizationId: "org-1", organizationName: "Org Uno", role: "OWNER" },
      organizations: [],
    });
  });

  it("nega la gestione team a un MEMBER", async () => {
    mockGetCurrentContext.mockResolvedValueOnce({
      user: { id: "u-member", email: "member@norma.casa", name: "Member" },
      current: { organizationId: "org-1", organizationName: "Org Uno", role: "MEMBER" },
      organizations: [],
    });
    const fd = new FormData();
    fd.set("email", "new@norma.casa");
    fd.set("role", "MEMBER");
    const out = await addTeamMemberAction(null, fd);
    expect(out).toEqual({ ok: false, message: "Solo OWNER o ADMIN possono gestire il team." });
    expect(mockPrisma.membership.create).not.toHaveBeenCalled();
  });

  it("aggiunge un membro esistente e invia email invito", async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ id: "u-2", email: "new@norma.casa" });
    mockPrisma.membership.findUnique.mockResolvedValueOnce(null);
    const fd = new FormData();
    fd.set("email", "new@norma.casa");
    fd.set("role", "ADMIN");

    const out = await addTeamMemberAction(null, fd);

    expect(mockPrisma.membership.create).toHaveBeenCalledWith({
      data: { organizationId: "org-1", userId: "u-2", role: "ADMIN" },
    });
    expect(mockSendTransactionalEmail).toHaveBeenCalled();
    expect(out).toEqual({ ok: true, message: "new@norma.casa aggiunto al team come ADMIN." });
  });

  it("impedisce ad ADMIN di promuovere OWNER", async () => {
    mockGetCurrentContext.mockResolvedValueOnce({
      user: { id: "u-admin", email: "admin@norma.casa", name: "Admin" },
      current: { organizationId: "org-1", organizationName: "Org Uno", role: "ADMIN" },
      organizations: [],
    });
    const fd = new FormData();
    fd.set("email", "new@norma.casa");
    fd.set("role", "OWNER");
    const out = await addTeamMemberAction(null, fd);
    expect(out).toEqual({ ok: false, message: "Solo un OWNER può promuovere a OWNER." });
    expect(mockPrisma.membership.create).not.toHaveBeenCalled();
  });
});
