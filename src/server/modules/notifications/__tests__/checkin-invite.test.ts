import { describe, expect, it } from "vitest";
import {
  chooseCheckinEmailKind,
  composeCheckinEmail,
  isValidEmail,
} from "../domain/checkin-invite";

const URL_FIXTURE = "https://app.norma.casa/checkin/abc123";
const PROPERTY = "Casa dei Glicini";

describe("composeCheckinEmail", () => {
  it("invito IT: contiene struttura, link e tono sobrio (snapshot)", () => {
    const email = composeCheckinEmail({
      kind: "invite",
      locale: "it",
      propertyName: PROPERTY,
      checkinUrl: URL_FIXTURE,
    });
    expect(email).toMatchInlineSnapshot(`
      {
        "subject": "Completa il check-in per il tuo soggiorno a Casa dei Glicini",
        "text": "Benvenuto,

      per il tuo soggiorno a Casa dei Glicini ti chiediamo di completare il check-in online: bastano due minuti e ti evita formalità all'arrivo.

      Completa qui:
      https://app.norma.casa/checkin/abc123

      Il link è personale: non condividerlo. Se hai già completato il check-in, ignora questo messaggio.

      — Norma, per conto del tuo host
      Compliance per affitti brevi · norma.casa",
      }
    `);
  });

  it("invito EN: contiene struttura, link e footer (snapshot)", () => {
    const email = composeCheckinEmail({
      kind: "invite",
      locale: "en",
      propertyName: PROPERTY,
      checkinUrl: URL_FIXTURE,
    });
    expect(email).toMatchInlineSnapshot(`
      {
        "subject": "Complete the check-in for your stay at Casa dei Glicini",
        "text": "Welcome,

      for your stay at Casa dei Glicini, please complete the online check-in: it only takes two minutes and saves you formalities on arrival.

      Complete it here:
      https://app.norma.casa/checkin/abc123

      This link is personal — please don't share it. If you've already checked in, ignore this message.

      — Norma, on behalf of your host
      Compliance for short-term rentals · norma.casa",
      }
    `);
  });

  it("promemoria IT: subject distinto e tono gentile (snapshot)", () => {
    const email = composeCheckinEmail({
      kind: "reminder",
      locale: "it",
      propertyName: PROPERTY,
      checkinUrl: URL_FIXTURE,
    });
    expect(email).toMatchInlineSnapshot(`
      {
        "subject": "Promemoria: completa il check-in per Casa dei Glicini",
        "text": "Ciao,

      manca poco al tuo arrivo a Casa dei Glicini e non risulta ancora completato il check-in online. Quando hai un minuto, completalo qui:
      https://app.norma.casa/checkin/abc123

      Bastano due minuti. Se lo hai già fatto, ignora pure questo messaggio.

      — Norma, per conto del tuo host
      Compliance per affitti brevi · norma.casa",
      }
    `);
  });

  it("promemoria EN: subject distinto (snapshot)", () => {
    const email = composeCheckinEmail({
      kind: "reminder",
      locale: "en",
      propertyName: PROPERTY,
      checkinUrl: URL_FIXTURE,
    });
    expect(email).toMatchInlineSnapshot(`
      {
        "subject": "Reminder: complete the check-in for Casa dei Glicini",
        "text": "Hi,

      your arrival at Casa dei Glicini is coming up and the online check-in isn't completed yet. When you have a minute, complete it here:
      https://app.norma.casa/checkin/abc123

      It only takes two minutes. If you've already done it, please ignore this message.

      — Norma, on behalf of your host
      Compliance for short-term rentals · norma.casa",
      }
    `);
  });

  it("include sempre l'URL esatto del check-in nel testo", () => {
    for (const kind of ["invite", "reminder"] as const) {
      for (const locale of ["it", "en"] as const) {
        const { text } = composeCheckinEmail({
          kind,
          locale,
          propertyName: PROPERTY,
          checkinUrl: URL_FIXTURE,
        });
        expect(text).toContain(URL_FIXTURE);
        expect(text).toContain(PROPERTY);
      }
    }
  });
});

describe("chooseCheckinEmailKind", () => {
  const now = Date.parse("2026-06-11T12:00:00Z");

  it("arrivo oltre 72h → invito", () => {
    const arrival = new Date(now + 1000 * 60 * 60 * 96);
    expect(chooseCheckinEmailKind(arrival, now)).toBe("invite");
  });

  it("arrivo entro 72h → promemoria", () => {
    const arrival = new Date(now + 1000 * 60 * 60 * 48);
    expect(chooseCheckinEmailKind(arrival, now)).toBe("reminder");
  });

  it("arrivo nel passato (host in ritardo) → promemoria", () => {
    const arrival = new Date(now - 1000 * 60 * 60);
    expect(chooseCheckinEmailKind(arrival, now)).toBe("reminder");
  });
});

describe("isValidEmail", () => {
  it.each(["ospite@example.com", "a.b+tag@sub.domain.it"])("accetta %s", (v) => {
    expect(isValidEmail(v)).toBe(true);
  });

  it.each(["", "no-at", "spazio @x.it", "x@y", "x@y."])("rifiuta %s", (v) => {
    expect(isValidEmail(v)).toBe(false);
  });
});
