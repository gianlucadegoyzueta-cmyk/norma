import { describe, expect, it, vi } from "vitest";
import { handleEscalation } from "../escalate";
import { InMemoryTicketStore } from "../adapters/InMemoryTicketStore";
import { buildFounderEmail } from "../domain/escalation";
import type { FounderNotifier } from "../ports";

describe("handleEscalation", () => {
  it("apre un ticket e avvisa il founder", async () => {
    const store = new InMemoryTicketStore();
    const notify = vi.fn(async () => {});
    const notifier: FounderNotifier = { notify };

    const ticket = await handleEscalation(
      {
        organizationId: null,
        question: "Devo fare le schedine per un ospite di una notte?",
        conversation: [
          { role: "user", content: "Devo fare le schedine per un ospite di una notte?" },
        ],
      },
      { store, notifier },
    );

    expect(store.tickets).toHaveLength(1);
    expect(ticket.id).toBe("mem-1");
    expect(notify).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith({
      id: "mem-1",
      question: expect.stringContaining("schedine"),
    });
  });

  it("se la notifica fallisce, il ticket resta comunque aperto", async () => {
    const store = new InMemoryTicketStore();
    const notifier: FounderNotifier = {
      notify: async () => {
        throw new Error("email giù");
      },
    };

    const ticket = await handleEscalation(
      { organizationId: null, question: "domanda", conversation: [] },
      { store, notifier },
    );

    expect(store.tickets).toHaveLength(1);
    expect(ticket.id).toBe("mem-1");
  });
});

describe("buildFounderEmail", () => {
  it("include la domanda e un riferimento al ticket", () => {
    const { subject, text } = buildFounderEmail("abcd1234efgh", "Come funziona Ross1000?");
    expect(subject).toContain("abcd1234");
    expect(text).toContain("Ross1000");
    expect(text).toContain("abcd1234efgh");
  });
});
