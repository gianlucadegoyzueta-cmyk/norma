import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FcmPushSender } from "../adapters/FcmPushSender";

// Guardia: nessuna chiamata di rete dai test.
let fetchSpy: ReturnType<typeof vi.spyOn> | undefined;
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch" as never).mockImplementation((() => {
    throw new Error("NESSUN invio reale consentito nei test");
  }) as never);
});
afterEach(() => {
  fetchSpy?.mockRestore();
  process.env = { ...ORIGINAL_ENV };
});

const MSG = {
  tokens: ["tok-a"],
  title: "Promemoria",
  body: "Scadenza vicina",
  pillar: "turismo" as const,
};

describe("FcmPushSender (inerte senza credenziali)", () => {
  it("non è configurato senza PUSH_ENABLED + chiavi", () => {
    delete process.env.PUSH_ENABLED;
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
    expect(FcmPushSender.isConfigured()).toBe(false);
  });

  it("senza chiavi non tocca la rete e ritorna { ok: 0 }", async () => {
    delete process.env.PUSH_ENABLED;
    delete process.env.FCM_SERVICE_ACCOUNT_JSON;
    const res = await new FcmPushSender().send(MSG);
    expect(res).toEqual({ ok: 0, failed: 0 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("con gate spento ma chiavi presenti resta inerte", async () => {
    process.env.PUSH_ENABLED = "false";
    process.env.FCM_SERVICE_ACCOUNT_JSON = "{}";
    expect(FcmPushSender.isConfigured()).toBe(false);
    const res = await new FcmPushSender().send(MSG);
    expect(res).toEqual({ ok: 0, failed: 0 });
  });
});
