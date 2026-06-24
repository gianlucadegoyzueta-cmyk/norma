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
      loadReport: async (_serializerId, ids) =>
        outcomes[ids.propertyId] ?? {
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
      loadReport: async () => {
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

  it("loadReport che LANCIA su una struttura → errored, le altre proseguono (batch non abortisce)", async () => {
    const sent: EmailMessage[] = [];
    const deps: IstatReminderDeps = {
      listProperties: async () => [
        {
          organizationId: "org1",
          propertyId: "boom",
          name: "Casa Boom",
          provincia: "RM",
          ownerEmail: "a@x.it",
        },
        {
          organizationId: "org1",
          propertyId: "ok",
          name: "Casa Ok",
          provincia: "RM",
          ownerEmail: "a@x.it",
        },
      ],
      loadReport: async (_s, ids) => {
        if (ids.propertyId === "boom") throw new Error("tracciato: luogoresidenza troppo lungo");
        return OK;
      },
      email: { send: async (m) => void sent.push(m) },
    };
    const res = await runMonthlyIstatReminders(deps, NOW);
    expect(res.errored).toBe(1);
    expect(res.ready).toBe(1);
    expect(res.orgsNotified).toBe(1); // l'email parte comunque, con riga di errore + riga ok
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("errore nel preparare");
    expect(sent[0].text).toContain("Casa Ok");
  });

  it("email.send che LANCIA su una org → emailFailed, le altre proseguono", async () => {
    const sent: EmailMessage[] = [];
    const deps: IstatReminderDeps = {
      listProperties: async () => [
        {
          organizationId: "orgBad",
          propertyId: "p1",
          name: "A",
          provincia: "RM",
          ownerEmail: "bad@x.it",
        },
        {
          organizationId: "orgGood",
          propertyId: "p2",
          name: "B",
          provincia: "RM",
          ownerEmail: "good@x.it",
        },
      ],
      loadReport: async () => OK,
      email: {
        send: async (m) => {
          if (m.to === "bad@x.it") throw new Error("smtp down");
          sent.push(m);
        },
      },
    };
    const res = await runMonthlyIstatReminders(deps, NOW);
    expect(res.emailFailed).toBe(1);
    expect(res.orgsNotified).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("good@x.it");
  });

  it("push owner (Turismo): invia all'OWNER con userId; isolata e additiva all'email", async () => {
    const pushed: { userId: string; title: string }[] = [];
    const props: ReminderProperty[] = [
      {
        organizationId: "orgP",
        propertyId: "pP",
        name: "Casa P",
        provincia: "RM",
        ownerEmail: "p@x.it",
        ownerUserId: "user-p",
      },
      // org senza ownerUserId → nessuna push, ma l'email parte lo stesso
      {
        organizationId: "orgQ",
        propertyId: "pQ",
        name: "Casa Q",
        provincia: "RM",
        ownerEmail: "q@x.it",
      },
    ];
    const { deps, sent } = fakeDeps(props, { pP: OK, pQ: OK });
    deps.push = {
      notifyTurismo: async (userId, title) => void pushed.push({ userId, title }),
    };

    const res = await runMonthlyIstatReminders(deps, NOW);

    expect(res.orgsNotified).toBe(2); // entrambe le email partono
    expect(res.pushSent).toBe(1); // solo l'org con ownerUserId
    expect(pushed).toEqual([{ userId: "user-p", title: "Movimento turistico Maggio 2026" }]);
    expect(sent).toHaveLength(2);
  });

  it("push che LANCIA → isolata: pushSent non incrementa, email non impattata", async () => {
    const props: ReminderProperty[] = [
      {
        organizationId: "orgR",
        propertyId: "pR",
        name: "Casa R",
        provincia: "RM",
        ownerEmail: "r@x.it",
        ownerUserId: "user-r",
      },
    ];
    const { deps, sent } = fakeDeps(props, { pR: OK });
    deps.push = {
      notifyTurismo: async () => {
        throw new Error("canale push giù");
      },
    };

    const res = await runMonthlyIstatReminders(deps, NOW);

    expect(res.orgsNotified).toBe(1);
    expect(res.pushSent).toBe(0);
    expect(sent).toHaveLength(1);
  });
});
