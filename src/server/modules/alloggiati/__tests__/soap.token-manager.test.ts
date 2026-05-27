import { describe, expect, it } from "vitest";
import {
  type AlloggiatiCredentialProvider,
  type TokenGenerator,
  TokenManager,
} from "../soap/token-manager";

const secret = { utente: "XX1", password: "p", wskey: "k" };
const provider: AlloggiatiCredentialProvider = { getSecret: async () => secret };

/** Client finto che conta le GenerateToken e restituisce token incrementali con scadenza fissa. */
function genClient(expires: Date) {
  const calls = { count: 0 };
  const client: TokenGenerator = {
    generateToken: async () => {
      calls.count += 1;
      return { utente: secret.utente, token: `TOK${calls.count}`, expires };
    },
  };
  return { client, calls };
}

describe("TokenManager", () => {
  it("cache: due getToken ravvicinati → una sola GenerateToken", async () => {
    const now = 1_000_000;
    const { client, calls } = genClient(new Date(now + 3_600_000));
    const tm = new TokenManager(client, provider, { now: () => now });
    expect((await tm.getToken("cred_1")).token).toBe("TOK1");
    expect((await tm.getToken("cred_1")).token).toBe("TOK1");
    expect(calls.count).toBe(1);
  });

  it("refresh lazy: dentro il margine di sicurezza → rigenera", async () => {
    const expires = new Date(2_000_000);
    let nowMs = expires.getTime() - 3_600_000; // molto prima della scadenza
    const { client, calls } = genClient(expires);
    const tm = new TokenManager(client, provider, { now: () => nowMs, safetyMarginMs: 60_000 });

    expect((await tm.getToken("cred_1")).token).toBe("TOK1");
    expect(calls.count).toBe(1);

    nowMs = expires.getTime() - 30_000; // 30s < margine 60s → deve rigenerare
    expect((await tm.getToken("cred_1")).token).toBe("TOK2");
    expect(calls.count).toBe(2);
  });

  it("single-flight: chiamate concorrenti → una sola GenerateToken", async () => {
    const now = 1_000_000;
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let count = 0;
    const client: TokenGenerator = {
      generateToken: async () => {
        count += 1;
        await gate; // resta in volo finché non sblocchiamo
        return { utente: "XX1", token: "TOK", expires: new Date(now + 3_600_000) };
      },
    };
    const tm = new TokenManager(client, provider, { now: () => now });

    const p1 = tm.getToken("cred_1");
    const p2 = tm.getToken("cred_1");
    release();
    const [a, b] = await Promise.all([p1, p2]);

    expect(a.token).toBe("TOK");
    expect(b.token).toBe("TOK");
    expect(count).toBe(1);
  });

  it("invalidate forza una nuova generazione", async () => {
    const now = 1_000_000;
    const { client, calls } = genClient(new Date(now + 3_600_000));
    const tm = new TokenManager(client, provider, { now: () => now });
    await tm.getToken("cred_1");
    tm.invalidate("cred_1");
    await tm.getToken("cred_1");
    expect(calls.count).toBe(2);
  });
});
