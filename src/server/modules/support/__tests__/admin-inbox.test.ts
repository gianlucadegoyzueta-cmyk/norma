import { afterEach, describe, expect, it } from "vitest";
import { isSupportAdmin } from "../domain/admin-access";
import { InMemoryTicketStore } from "../adapters/InMemoryTicketStore";

describe("isSupportAdmin (gate dell'inbox founder)", () => {
  const prev = process.env.SUPPORT_ADMIN_EMAILS;
  afterEach(() => {
    if (prev === undefined) delete process.env.SUPPORT_ADMIN_EMAILS;
    else process.env.SUPPORT_ADMIN_EMAILS = prev;
  });

  it("ammette solo le email in allowlist (case-insensitive, trim)", () => {
    process.env.SUPPORT_ADMIN_EMAILS = "founder@norma.casa,  Gianluca@x.com ";
    expect(isSupportAdmin("founder@norma.casa")).toBe(true);
    expect(isSupportAdmin("GIANLUCA@x.com")).toBe(true);
    expect(isSupportAdmin("estraneo@x.com")).toBe(false);
    expect(isSupportAdmin(null)).toBe(false);
  });

  it("allowlist vuota → nessun accesso (secure-by-default)", () => {
    delete process.env.SUPPORT_ADMIN_EMAILS;
    expect(isSupportAdmin("founder@norma.casa")).toBe(false);
  });
});

describe("InMemoryTicketStore (lettura/chiusura)", () => {
  it("listOpen restituisce i creati; close li rimuove", async () => {
    const store = new InMemoryTicketStore();
    const a = await store.create({
      organizationId: null,
      question: "q1",
      conversation: [],
    });
    await store.create({
      organizationId: "org1",
      question: "q2",
      conversation: [],
    });

    expect(await store.listOpen()).toHaveLength(2);

    await store.close(a.id);
    const open = await store.listOpen();
    expect(open).toHaveLength(1);
    expect(open[0]?.question).toBe("q2");
  });
});
