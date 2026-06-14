import { describe, expect, it } from "vitest";
import { evaluateCronGate } from "../cron-gate";

const SECRET = "s3cr3t";

describe("evaluateCronGate", () => {
  it("flag non attivo → 503 (default disattivato)", () => {
    const r = evaluateCronGate({
      enabledFlag: undefined,
      cronSecret: SECRET,
      authHeader: `Bearer ${SECRET}`,
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(503);
  });

  it("flag attivo ma CRON_SECRET mancante → 500", () => {
    const r = evaluateCronGate({
      enabledFlag: "true",
      cronSecret: undefined,
      authHeader: "Bearer x",
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(500);
  });

  it("secret errato → 401", () => {
    const r = evaluateCronGate({
      enabledFlag: "true",
      cronSecret: SECRET,
      authHeader: "Bearer nope",
    });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(401);
  });

  it("flag attivo + bearer corretto → ok", () => {
    const r = evaluateCronGate({
      enabledFlag: "true",
      cronSecret: SECRET,
      authHeader: `Bearer ${SECRET}`,
    });
    expect(r.ok).toBe(true);
    expect(r.status).toBe(200);
  });
});
