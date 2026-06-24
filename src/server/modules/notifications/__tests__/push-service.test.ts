import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakePushSender } from "../adapters/FakePushSender";
import { PushNotificationService } from "../push-service";
import type {
  DeviceTokenRecord,
  DeviceTokenRepository,
  NotificationConsent,
  NotificationPreferenceRepository,
  Pillar,
} from "../ports";

/** Repo device in memoria per i test. */
class InMemoryDeviceTokens implements DeviceTokenRepository {
  constructor(private tokensByUser: Record<string, string[]> = {}) {}
  async register(userId: string, device: DeviceTokenRecord): Promise<void> {
    this.tokensByUser[userId] = [...(this.tokensByUser[userId] ?? []), device.token];
  }
  async remove(token: string): Promise<void> {
    for (const u of Object.keys(this.tokensByUser)) {
      this.tokensByUser[u] = this.tokensByUser[u].filter((t) => t !== token);
    }
  }
  async listTokensForUser(userId: string): Promise<string[]> {
    return this.tokensByUser[userId] ?? [];
  }
}

/** Repo preferenze in memoria. */
class InMemoryPreferences implements NotificationPreferenceRepository {
  constructor(private consent: NotificationConsent = { alloggiati: true, turismo: true }) {}
  async get(): Promise<NotificationConsent> {
    return this.consent;
  }
  async set(_userId: string, pillar: Pillar, enabled: boolean): Promise<void> {
    this.consent = { ...this.consent, [pillar]: enabled };
  }
}

// Guardia: nessun invio reale dai test (il PushSender è il fake, che non tocca la rete).
let fetchSpy: ReturnType<typeof vi.spyOn> | undefined;
beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch" as never).mockImplementation((() => {
    throw new Error("NESSUN invio reale consentito nei test");
  }) as never);
});
afterEach(() => {
  fetchSpy?.mockRestore();
});

const INPUT = { title: "Schedina da confermare", body: "Hai 1 schedina in attesa." };

describe("PushNotificationService.notify", () => {
  it("invia quando c'è consenso e almeno un token", async () => {
    const sender = new FakePushSender();
    const service = new PushNotificationService(
      sender,
      new InMemoryDeviceTokens({ u1: ["tok-a", "tok-b"] }),
      new InMemoryPreferences(),
    );

    const res = await service.notify("u1", "alloggiati", INPUT);

    expect(res).toEqual({ ok: true, delivered: 2 });
    expect(sender.sent).toHaveLength(1);
    expect(sender.sent[0]).toMatchObject({ pillar: "alloggiati", tokens: ["tok-a", "tok-b"] });
  });

  it("NON invia se il consenso del pilastro è spento", async () => {
    const sender = new FakePushSender();
    const service = new PushNotificationService(
      sender,
      new InMemoryDeviceTokens({ u1: ["tok-a"] }),
      new InMemoryPreferences({ alloggiati: false, turismo: true }),
    );

    const res = await service.notify("u1", "alloggiati", INPUT);

    expect(res).toEqual({ ok: false, reason: "consent_off" });
    expect(sender.sent).toHaveLength(0);
  });

  it("rispetta il consenso per-pilastro in modo indipendente", async () => {
    const sender = new FakePushSender();
    const service = new PushNotificationService(
      sender,
      new InMemoryDeviceTokens({ u1: ["tok-a"] }),
      new InMemoryPreferences({ alloggiati: false, turismo: true }),
    );

    const res = await service.notify("u1", "turismo", INPUT);

    expect(res).toEqual({ ok: true, delivered: 1 });
    expect(sender.sent[0]?.pillar).toBe("turismo");
  });

  it("no-op se l'utente non ha device registrati", async () => {
    const sender = new FakePushSender();
    const service = new PushNotificationService(
      sender,
      new InMemoryDeviceTokens({}),
      new InMemoryPreferences(),
    );

    const res = await service.notify("u1", "alloggiati", INPUT);

    expect(res).toEqual({ ok: false, reason: "no_tokens" });
    expect(sender.sent).toHaveLength(0);
  });

  it("circuit breaker: un errore del canale non lancia, ritorna send_failed", async () => {
    const sender = new FakePushSender();
    sender.failWith = new Error("canale giù");
    const service = new PushNotificationService(
      sender,
      new InMemoryDeviceTokens({ u1: ["tok-a"] }),
      new InMemoryPreferences(),
    );

    const res = await service.notify("u1", "alloggiati", INPUT);

    expect(res).toEqual({ ok: false, reason: "send_failed" });
  });
});
