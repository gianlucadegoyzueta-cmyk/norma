import { describe, expect, it } from "vitest";
import { composeCheckinEmail } from "../domain/checkin-invite";
import { FakeEmailSender } from "../adapters/FakeEmailSender";

describe("EmailSender (transport finto)", () => {
  it("registra il messaggio composto, senza rete", async () => {
    const sender = new FakeEmailSender();
    const composed = composeCheckinEmail({
      kind: "invite",
      locale: "it",
      propertyName: "Casa dei Glicini",
      checkinUrl: "https://app.norma.casa/checkin/abc123",
    });

    await sender.send({ to: "ospite@example.com", ...composed });

    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]).toMatchObject({
      to: "ospite@example.com",
      subject: composed.subject,
      text: composed.text,
      html: composed.html,
    });
  });

  it("propaga un fallimento del canale (per gestirlo nel chiamante)", async () => {
    const sender = new FakeEmailSender();
    sender.failWith = new Error("Resend down");

    await expect(
      sender.send({ to: "ospite@example.com", subject: "x", text: "y" }),
    ).rejects.toThrow("Resend down");
    expect(sender.sent).toHaveLength(0);
  });
});
