import { describe, expect, it } from "vitest";
import type { EmailMessage } from "../../../notifications/ports";
import type { Ross1000Outcome } from "../../ross1000/report";
import {
  runMonthlyIstatReminders,
  type IstatReminderDeps,
  type ReminderProperty,
} from "../istat-reminder.service";

function fakeDeps(
  properties: ReminderProperty[],
  outcomes: Record<string, Ross1000Outcome>,
): { deps: IstatReminderDeps; sent: EmailMessage[] } {
  const sent: EmailMessage[] = [];
  return {
    sent,
    deps: {
      listProperties: async () => properties,
      loadRoss1000: async (_org, propertyId) =>
        outcomes[propertyId] ?? {
          kind: "INCOMPLETE",
          missing: [{ field: "codice", scope: "STRUTTURA" }],
        },
      email: { send: async (m) => void sent.push(m) },
    },
  };
}

const OK: Ross1000Outcome = {
  kind: "OK",
  xml: "<movimenti/>",
  codice: "A1",
  arrivi: 1,
  partenze: 1,
  presenze: 2,
};
const NOW = new Date("2026-06-05T09:00:00Z"); // periodo precedente = 2026-05 (Maggio), scadenza 2026-06-05

describe("runMonthlyIstatReminders", () => {
  it("FILE region: OK → 'pronto', INCOMPLETE → elenco mancanti; una email per org", async () => {
    const props: ReminderProperty[] = [
      {
        organizationId: "org1",
        propertyId: "pA",
        name: "Casa A",
        provincia: "RM",
        ownerEmail: "a@x.it",
      },
      {
        organizationId: "org1",
        propertyId: "pB",
        name: "Casa B",
        provincia: "RM",
        ownerEmail: "a@x.it",
      },
    ];
    const { deps, sent } = fakeDeps(props, {
      pA: OK,
      pB: { kind: "INCOMPLETE", missing: [{ field: "tipoturismo", scope: "GUEST", refId: "g1" }] },
    });
    const res = await runMonthlyIstatReminders(deps, NOW);

    expect(res.period).toBe("2026-05");
    expect(res.ready).toBe(1);
    expect(res.incomplete).toBe(1);
    expect(res.orgsNotified).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("a@x.it");
    expect(sent[0].subject).toContain("Maggio 2026");
    expect(sent[0].subject).toContain("2026-06-05");
    expect(sent[0].text).toContain("Casa A");
    expect(sent[0].text).toContain("pronto");
    expect(sent[0].text).toContain("Casa B");
    expect(sent[0].text).toContain("tipo turismo"); // etichetta leggibile del campo mancante
  });

  it("regione ASSISTITO → nota inserimento manuale, niente file", async () => {
    const props: ReminderProperty[] = [
      {
        organizationId: "org2",
        propertyId: "pC",
        name: "Casa C",
        provincia: "NA",
        ownerEmail: "b@y.it",
      },
    ];
    const { deps, sent } = fakeDeps(props, {});
    const res = await runMonthlyIstatReminders(deps, NOW);
    expect(res.assistito).toBe(1);
    expect(res.ready).toBe(0);
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("non integrato");
  });

  it("org senza email owner → conteggiata in skippedNoEmail, nessun invio", async () => {
    const props: ReminderProperty[] = [
      {
        organizationId: "org3",
        propertyId: "pD",
        name: "Casa D",
        provincia: "RM",
        ownerEmail: null,
      },
    ];
    const { deps, sent } = fakeDeps(props, { pD: OK });
    const res = await runMonthlyIstatReminders(deps, NOW);
    expect(res.ready).toBe(1);
    expect(res.skippedNoEmail).toBe(1);
    expect(res.orgsNotified).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("provincia non riconosciuta → struttura saltata (nessuna riga, nessun report)", async () => {
    let loaded = 0;
    const deps: IstatReminderDeps = {
      listProperties: async () => [
        {
          organizationId: "org4",
          propertyId: "pE",
          name: "Casa E",
          provincia: "XX",
          ownerEmail: "e@z.it",
        },
      ],
      loadRoss1000: async () => {
        loaded += 1;
        return OK;
      },
      email: { send: async () => undefined },
    };
    const res = await runMonthlyIstatReminders(deps, NOW);
    expect(loaded).toBe(0);
    expect(res.orgsNotified).toBe(0);
    expect(res.ready + res.incomplete + res.assistito).toBe(0);
  });
});
