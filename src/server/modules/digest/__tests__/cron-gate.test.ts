import { describe, expect, it } from "vitest";
import { evaluateDigestGate } from "../domain/cron-gate";

/**
 * Gating della route cron del digest: DISATTIVATA di default (flag DIGEST_ENABLED, separato da
 * quello degli invii Alloggiati) e, anche da attiva, solo per il cron Vercel autenticato
 * (Bearer CRON_SECRET). Fail-closed se il segreto manca.
 */
describe("evaluateDigestGate", () => {
  const SECRET = "s3cr3t";

  it("flag assente → disabled (default)", () => {
    expect(
      evaluateDigestGate({
        enabledFlag: undefined,
        cronSecret: SECRET,
        authHeader: `Bearer ${SECRET}`,
      }),
    ).toEqual({ kind: "disabled" });
  });

  it("flag ≠ 'true' → disabled", () => {
    expect(
      evaluateDigestGate({ enabledFlag: "1", cronSecret: SECRET, authHeader: `Bearer ${SECRET}` }),
    ).toEqual({ kind: "disabled" });
    expect(
      evaluateDigestGate({
        enabledFlag: "false",
        cronSecret: SECRET,
        authHeader: `Bearer ${SECRET}`,
      }),
    ).toEqual({ kind: "disabled" });
  });

  it("abilitato ma CRON_SECRET non configurato → unauthorized (fail-closed)", () => {
    expect(
      evaluateDigestGate({
        enabledFlag: "true",
        cronSecret: undefined,
        authHeader: "Bearer whatever",
      }).kind,
    ).toBe("unauthorized");
  });

  it("abilitato ma Authorization mancante → unauthorized", () => {
    expect(
      evaluateDigestGate({ enabledFlag: "true", cronSecret: SECRET, authHeader: null }).kind,
    ).toBe("unauthorized");
  });

  it("abilitato ma Authorization sbagliata → unauthorized", () => {
    expect(
      evaluateDigestGate({ enabledFlag: "true", cronSecret: SECRET, authHeader: "Bearer nope" })
        .kind,
    ).toBe("unauthorized");
  });

  it("abilitato + Bearer corretto → run", () => {
    expect(
      evaluateDigestGate({
        enabledFlag: "true",
        cronSecret: SECRET,
        authHeader: `Bearer ${SECRET}`,
      }),
    ).toEqual({ kind: "run" });
  });
});
