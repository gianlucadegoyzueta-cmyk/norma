import { describe, expect, it } from "vitest";
import { FakeEmailSender } from "../../notifications/adapters/FakeEmailSender";
import { WeeklyDigestService } from "../services/digest.service";
import type { DigestRepository, OrgDigestTarget, WeeklyDigestFacts, WeekWindow } from "../ports";

const WINDOW: WeekWindow = {
  start: new Date("2026-06-01T00:00:00Z"),
  end: new Date("2026-06-08T00:00:00Z"),
};

const FACTS: WeeklyDigestFacts = {
  done: { schedineAcquired: 2, checkinsCompleted: 1, staysAdded: 1, taxDeclared: 0 },
  upcoming: { schedinePending: 0, arrivalsNext7Days: 1, checkinsAwaiting: 0 },
  position: { overdue: 0, needsReview: 0 },
};

/** Repository finto: targets fissi e facts costanti (eventuale errore mirato per org). */
function fakeRepo(
  targets: OrgDigestTarget[],
  gatherError?: (orgId: string) => boolean,
): DigestRepository {
  return {
    async listTargets() {
      return targets;
    },
    async gatherWeekly(orgId) {
      if (gatherError?.(orgId)) throw new Error("boom");
      return FACTS;
    },
  };
}

const orgA: OrgDigestTarget = {
  organizationId: "a",
  orgName: "Casa A",
  recipients: [{ email: "a@host.it", name: "A" }],
};
const orgB: OrgDigestTarget = {
  organizationId: "b",
  orgName: "Casa B",
  recipients: [
    { email: "b1@host.it", name: "B1" },
    { email: "b2@host.it", name: "B2" },
  ],
};

describe("WeeklyDigestService", () => {
  it("invia un'email a ogni destinatario di ogni org", async () => {
    const email = new FakeEmailSender();
    const report = await new WeeklyDigestService(fakeRepo([orgA, orgB]), email).run(WINDOW);

    expect(email.sent).toHaveLength(3);
    expect(report.sent).toBe(3);
    expect(report.organizations).toBe(2);
    expect(report.failed).toBe(0);
    expect(report.weekStartIso).toBe("2026-06-01");
    expect(report.weekEndIso).toBe("2026-06-07");
    expect(email.sent.map((m) => m.to)).toEqual(["a@host.it", "b1@host.it", "b2@host.it"]);
  });

  it("un errore di raccolta su un'org non ferma le altre", async () => {
    const email = new FakeEmailSender();
    const report = await new WeeklyDigestService(
      fakeRepo([orgA, orgB], (id) => id === "a"),
      email,
    ).run(WINDOW);

    // org A fallisce in gather, org B invia regolarmente.
    expect(report.failed).toBe(1);
    expect(report.sent).toBe(2);
    expect(email.sent.every((m) => m.to.startsWith("b"))).toBe(true);
    const outcomeA = report.outcomes.find((o) => o.organizationId === "a");
    expect(outcomeA?.errors[0]?.stage).toBe("gather");
  });

  it("un canale email rotto è registrato come errore, non fa esplodere il run", async () => {
    const email = new FakeEmailSender();
    email.failWith = new Error("resend down");
    const report = await new WeeklyDigestService(fakeRepo([orgA]), email).run(WINDOW);

    expect(report.sent).toBe(0);
    expect(report.failed).toBe(1);
    expect(report.outcomes[0]?.errors[0]?.stage).toBe("send");
  });

  it("nessun target → report vuoto, nessun invio", async () => {
    const email = new FakeEmailSender();
    const report = await new WeeklyDigestService(fakeRepo([]), email).run(WINDOW);
    expect(report.organizations).toBe(0);
    expect(report.sent).toBe(0);
    expect(email.sent).toHaveLength(0);
  });
});
