import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeEmailSender } from "../adapters/FakeEmailSender";
import { CheckinInviteService } from "../service";

const BASE_INPUT = {
  to: "ospite@example.com",
  propertyName: "Casa dei Glicini",
  checkinUrl: "https://app.norma.casa/checkin/abc123",
} as const;

// Guardia di sicurezza: spia su fetch globale per provare che NESSUN invio reale parte dai test.
// Il servizio usa l'EmailSender iniettato (FakeEmailSender), che non tocca la rete.
let fetchSpy: ReturnType<typeof vi.spyOn> | undefined;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch" as never).mockImplementation((() => {
    throw new Error("NESSUN invio reale consentito nei test");
  }) as never);
});

afterEach(() => {
  fetchSpy?.mockRestore();
  vi.useRealTimers();
});

describe("CheckinInviteService.send", () => {
  it("compone e consegna al transport finto, senza alcuna rete", async () => {
    const sender = new FakeEmailSender();
    const service = new CheckinInviteService(sender);

    const res = await service.send({
      ...BASE_INPUT,
      arrivalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10), // oltre 72h → invito
      locale: "en",
    });

    expect(res).toMatchObject({ ok: true, kind: "invite", locale: "en" });
    expect(sender.sent).toHaveLength(1);
    const msg = sender.sent[0];
    expect(msg.to).toBe(BASE_INPUT.to);
    expect(msg.subject.length).toBeGreaterThan(0);
    expect(msg.text).toContain(BASE_INPUT.checkinUrl);
    expect(msg.html).toContain(BASE_INPUT.checkinUrl);
    expect(msg.html).toContain("#bc4b2b"); // terracotta on-brand
    // PROVA che non è stata fatta alcuna chiamata HTTP reale.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sceglie il promemoria quando l'arrivo è entro 72h", async () => {
    const sender = new FakeEmailSender();
    const service = new CheckinInviteService(sender);

    const res = await service.send({
      ...BASE_INPUT,
      arrivalDate: new Date(Date.now() + 1000 * 60 * 60 * 12), // entro 72h → promemoria
    });

    expect(res).toMatchObject({ ok: true, kind: "reminder", locale: "it" });
  });

  it("rispetta il tipo forzato (kind) ignorando l'arrivo", async () => {
    const sender = new FakeEmailSender();
    const service = new CheckinInviteService(sender);

    const res = await service.send({
      ...BASE_INPUT,
      arrivalDate: new Date(Date.now() + 1000 * 60 * 60 * 12), // sarebbe promemoria
      kind: "invite",
    });

    expect(res).toMatchObject({ ok: true, kind: "invite" });
  });

  it("ripiega sul default it quando la lingua non è supportata", async () => {
    const sender = new FakeEmailSender();
    const service = new CheckinInviteService(sender);

    const res = await service.send({
      ...BASE_INPUT,
      arrivalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      locale: "zz",
    });

    expect(res).toMatchObject({ ok: true, locale: "it" });
  });

  it("rifiuta un indirizzo email non valido senza inviare nulla", async () => {
    const sender = new FakeEmailSender();
    const service = new CheckinInviteService(sender);

    const res = await service.send({
      ...BASE_INPUT,
      to: "non-una-email",
      arrivalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    });

    expect(res).toEqual({ ok: false, error: "invalid_email" });
    expect(sender.sent).toHaveLength(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("propaga un fallimento del canale come send_failed (gestione nel chiamante)", async () => {
    const sender = new FakeEmailSender();
    sender.failWith = new Error("Resend down");
    const service = new CheckinInviteService(sender);

    const res = await service.send({
      ...BASE_INPUT,
      arrivalDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    });

    expect(res).toEqual({ ok: false, error: "send_failed" });
    expect(sender.sent).toHaveLength(0);
  });
});
