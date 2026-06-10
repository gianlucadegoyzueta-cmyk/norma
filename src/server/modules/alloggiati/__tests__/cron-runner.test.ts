import { describe, expect, it } from "vitest";
import type { ReconcileResult } from "../services/reconcile.service";
import { runSendAndReconcile, type CronRunnerDeps } from "../services/cron-runner";

/**
 * Orchestrazione del job invio+reconcile: per ogni credenziale attiva fa send poi reconcile,
 * resiliente per-credenziale (un errore non ferma le altre, e l'errore di send non blocca il
 * reconcile della stessa credenziale).
 */

function reconcileResult(verdict: ReconcileResult["verdict"], n: number): ReconcileResult {
  return {
    total: n,
    expected: n,
    reported: n,
    verdict,
    confirmed: verdict === "MATCH" ? n : 0,
    requeued: verdict === "NONE_SENT" ? n : 0,
    review: verdict === "MISMATCH" ? n : 0,
    rows: [],
  };
}

const DATE = "2026-06-09";

describe("runSendAndReconcile", () => {
  it("itera tutte le credenziali attive: send poi reconcile, in ordine", async () => {
    const calls: string[] = [];
    const deps: CronRunnerDeps = {
      listActiveCredentialIds: async () => ["c1", "c2"],
      send: async (id) => {
        calls.push(`send:${id}`);
      },
      reconcile: async (id, date) => {
        calls.push(`reconcile:${id}:${date}`);
        return reconcileResult("MATCH", 1);
      },
      reconcileDateIso: DATE,
    };

    const report = await runSendAndReconcile(deps);

    expect(calls).toEqual(["send:c1", `reconcile:c1:${DATE}`, "send:c2", `reconcile:c2:${DATE}`]);
    expect(report.credentials).toBe(2);
    expect(report.failed).toBe(0);
    expect(report.outcomes[0].reconcile?.verdict).toBe("MATCH");
    expect(report.reconcileDateIso).toBe(DATE);
  });

  it("nessuna credenziale attiva → report vuoto, nessuna chiamata", async () => {
    let touched = false;
    const report = await runSendAndReconcile({
      listActiveCredentialIds: async () => [],
      send: async () => {
        touched = true;
      },
      reconcile: async () => {
        touched = true;
        return reconcileResult("MATCH", 0);
      },
      reconcileDateIso: DATE,
    });
    expect(report.credentials).toBe(0);
    expect(report.outcomes).toEqual([]);
    expect(touched).toBe(false);
  });

  it("errore di send NON blocca il reconcile della stessa credenziale", async () => {
    let reconciled = false;
    const report = await runSendAndReconcile({
      listActiveCredentialIds: async () => ["c1"],
      send: async () => {
        throw new Error("rete giù in invio");
      },
      reconcile: async () => {
        reconciled = true;
        return reconcileResult("NONE_SENT", 2);
      },
      reconcileDateIso: DATE,
    });
    expect(reconciled).toBe(true);
    expect(report.failed).toBe(1);
    expect(report.outcomes[0].errors).toEqual([{ phase: "send", message: "rete giù in invio" }]);
    expect(report.outcomes[0].reconcile?.verdict).toBe("NONE_SENT");
  });

  it("un errore su una credenziale non ferma le altre", async () => {
    const seen: string[] = [];
    const report = await runSendAndReconcile({
      listActiveCredentialIds: async () => ["bad", "good"],
      send: async (id) => {
        seen.push(id);
        if (id === "bad") throw new Error("boom");
      },
      reconcile: async (id) => {
        if (id === "bad") throw new Error("anche qui");
        return reconcileResult("MATCH", 1);
      },
      reconcileDateIso: DATE,
    });
    expect(seen).toEqual(["bad", "good"]);
    expect(report.failed).toBe(1);
    expect(report.outcomes[1].credentialId).toBe("good");
    expect(report.outcomes[1].errors).toEqual([]);
    expect(report.outcomes[1].reconcile?.verdict).toBe("MATCH");
  });
});
