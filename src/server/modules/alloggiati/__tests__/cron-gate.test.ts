import { describe, expect, it } from "vitest";
import { evaluateCronGate } from "../domain/cron-gate";

/**
 * Gating della route cron: DISATTIVATA di default (flag) e, anche da attiva, solo per il cron
 * Vercel autenticato (Bearer CRON_SECRET). Fail-closed se il segreto manca.
 */
describe("evaluateCronGate", () => {
  const SECRET = "s3cr3t";

  it("flag assente → disabled (default)", () => {
    expect(
      evaluateCronGate({
        enabledFlag: undefined,
        cronSecret: SECRET,
        authHeader: `Bearer ${SECRET}`,
      }),
    ).toEqual({ kind: "disabled" });
  });

  it("flag ≠ 'true' → disabled", () => {
    expect(
      evaluateCronGate({ enabledFlag: "1", cronSecret: SECRET, authHeader: `Bearer ${SECRET}` }),
    ).toEqual({ kind: "disabled" });
    expect(
      evaluateCronGate({
        enabledFlag: "false",
        cronSecret: SECRET,
        authHeader: `Bearer ${SECRET}`,
      }),
    ).toEqual({ kind: "disabled" });
  });

  it("abilitato ma CRON_SECRET non configurato → unauthorized (fail-closed)", () => {
    const gate = evaluateCronGate({
      enabledFlag: "true",
      cronSecret: undefined,
      authHeader: "Bearer whatever",
    });
    expect(gate.kind).toBe("unauthorized");
  });

  it("abilitato ma Authorization mancante → unauthorized", () => {
    const gate = evaluateCronGate({ enabledFlag: "true", cronSecret: SECRET, authHeader: null });
    expect(gate.kind).toBe("unauthorized");
  });

  it("abilitato ma Authorization sbagliata → unauthorized", () => {
    const gate = evaluateCronGate({
      enabledFlag: "true",
      cronSecret: SECRET,
      authHeader: "Bearer nope",
    });
    expect(gate.kind).toBe("unauthorized");
  });

  it("abilitato + Bearer corretto → run", () => {
    expect(
      evaluateCronGate({ enabledFlag: "true", cronSecret: SECRET, authHeader: `Bearer ${SECRET}` }),
    ).toEqual({ kind: "run" });
  });
});
