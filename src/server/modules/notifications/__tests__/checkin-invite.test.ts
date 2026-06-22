import { describe, expect, it } from "vitest";
import { CHECKIN_EMAIL_STRINGS, type CheckinEmailStrings } from "../domain/checkin-invite-content";
import {
  chooseCheckinEmailKind,
  composeCheckinEmail,
  EMAIL_LOCALES,
  isValidEmail,
} from "../domain/checkin-invite";

const URL_FIXTURE = "https://app.norma.casa/checkin/abc123";
const PROPERTY = "Casa dei Glicini";
const KINDS = ["invite", "reminder"] as const;

describe("composeCheckinEmail — copertura multilingua", () => {
  it("supporta esattamente it/en/de/fr/es (allineate al check-in pubblico)", () => {
    expect([...EMAIL_LOCALES]).toEqual(["it", "en", "de", "fr", "es"]);
  });

  it("rende subject, text e html per ogni lingua e tipo", () => {
    for (const locale of EMAIL_LOCALES) {
      for (const kind of KINDS) {
        const email = composeCheckinEmail({
          kind,
          locale,
          propertyName: PROPERTY,
          checkinUrl: URL_FIXTURE,
        });
        expect(email.subject.length, `subject ${locale}/${kind}`).toBeGreaterThan(0);
        expect(email.text.length, `text ${locale}/${kind}`).toBeGreaterThan(0);
        expect(email.html.length, `html ${locale}/${kind}`).toBeGreaterThan(0);
      }
    }
  });

  it("include sempre nome immobile e URL esatto in testo e html", () => {
    for (const locale of EMAIL_LOCALES) {
      for (const kind of KINDS) {
        const { text, html } = composeCheckinEmail({
          kind,
          locale,
          propertyName: PROPERTY,
          checkinUrl: URL_FIXTURE,
        });
        expect(text).toContain(URL_FIXTURE);
        expect(text).toContain(PROPERTY);
        expect(html).toContain(URL_FIXTURE);
        expect(html).toContain(PROPERTY);
      }
    }
  });

  it("il testo semplice non contiene markup HTML", () => {
    for (const locale of EMAIL_LOCALES) {
      const { text } = composeCheckinEmail({
        kind: "invite",
        locale,
        propertyName: PROPERTY,
        checkinUrl: URL_FIXTURE,
      });
      expect(text).not.toMatch(/<[a-z!/]/i);
    }
  });

  it("l'html è on-brand 'Carta & Inchiostro' (terracotta + avorio) e ha lang corretto", () => {
    for (const locale of EMAIL_LOCALES) {
      const { html } = composeCheckinEmail({
        kind: "invite",
        locale,
        propertyName: PROPERTY,
        checkinUrl: URL_FIXTURE,
      });
      expect(html).toContain("#bc4b2b"); // terracotta
      expect(html).toContain("#f7f2e8"); // avorio
      expect(html).toContain("Fraunces");
      expect(html).toContain(`<html lang="${locale}">`);
      expect(html).toContain('role="presentation"'); // table-based layout
      expect(html.toLowerCase()).toContain("<!doctype html>");
    }
  });

  it("escapa il nome immobile nell'html (no injection)", () => {
    const { html } = composeCheckinEmail({
      kind: "invite",
      locale: "it",
      propertyName: "Casa <script>\"&'",
      checkinUrl: URL_FIXTURE,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("invito vs promemoria hanno subject distinti (per lingua)", () => {
    for (const locale of EMAIL_LOCALES) {
      const invite = composeCheckinEmail({
        kind: "invite",
        locale,
        propertyName: PROPERTY,
        checkinUrl: URL_FIXTURE,
      });
      const reminder = composeCheckinEmail({
        kind: "reminder",
        locale,
        propertyName: PROPERTY,
        checkinUrl: URL_FIXTURE,
      });
      expect(invite.subject).not.toBe(reminder.subject);
    }
  });
});

describe("CHECKIN_EMAIL_STRINGS — nessuna chiave vuota", () => {
  const REQUIRED_KEYS: (keyof CheckinEmailStrings)[] = [
    "subject",
    "greeting",
    "body",
    "cta",
    "linkLabel",
    "note",
    "footerSignature",
    "footerTagline",
  ];

  it("ogni lingua e tipo ha tutte le chiavi valorizzate (non vuote)", () => {
    for (const locale of EMAIL_LOCALES) {
      for (const kind of KINDS) {
        const strings = CHECKIN_EMAIL_STRINGS[locale][kind];
        for (const key of REQUIRED_KEYS) {
          const value = strings[key];
          expect(typeof value, `${locale}/${kind}/${key} tipo`).toBe("string");
          expect(value.trim().length, `${locale}/${kind}/${key} vuoto`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("subject e body contengono il placeholder {property} (lo legano allo struttura)", () => {
    for (const locale of EMAIL_LOCALES) {
      for (const kind of KINDS) {
        const { subject, body } = CHECKIN_EMAIL_STRINGS[locale][kind];
        expect(subject, `${locale}/${kind} subject`).toContain("{property}");
        expect(body, `${locale}/${kind} body`).toContain("{property}");
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
