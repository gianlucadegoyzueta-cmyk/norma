import { describe, expect, it } from "vitest";
import type { SchedinaRecord } from "../ports/SchedinaRepository";
import { SchedinaVerifyService } from "../services/verify.service";

function pending(ids: string[]): SchedinaRecord[] {
  return ids.map((id) => ({
    id,
    organizationId: "org_1",
    credentialId: "cred_1",
    status: "PENDING" as const,
    dedupKey: `dk_${id}`,
  }));
}

const tokens = { getToken: async () => ({ utente: "u", token: "t" }) };
const buildRecord = (id: string) => `record_${id}`;

describe("SchedinaVerifyService", () => {
  it("nessuna schedina PENDING → risultato vuoto, nessuna chiamata Test", async () => {
    let called = false;
    const tester = {
      test: async () => {
        called = true;
        return { overall: { esito: true }, righe: [] };
      },
    };
    const svc = new SchedinaVerifyService(
      { listPendingByCredential: async () => [] },
      tokens,
      tester,
      buildRecord,
    );
    const res = await svc.verifyCredentialBatch("cred_1");
    expect(res).toEqual({ total: 0, valid: 0, rows: [] });
    expect(called).toBe(false);
  });

  it("tutte valide → valid === total", async () => {
    const tester = {
      test: async (_u: string, _t: string, righe: readonly string[]) => ({
        overall: { esito: true },
        righe: righe.map(() => ({ esito: true })),
      }),
    };
    const svc = new SchedinaVerifyService(
      { listPendingByCredential: async () => pending(["s1", "s2"]) },
      tokens,
      tester,
      buildRecord,
    );
    const res = await svc.verifyCredentialBatch("cred_1");
    expect(res.total).toBe(2);
    expect(res.valid).toBe(2);
    expect(res.rows.every((r) => r.valid)).toBe(true);
  });

  it("esiti misti → mappa errori per indice sugli id (in ordine)", async () => {
    const tester = {
      test: async () => ({
        overall: { esito: true },
        righe: [
          { esito: true },
          { esito: false, errorCod: "12", errorDes: "Data di Arrivo Errata" },
        ],
      }),
    };
    const svc = new SchedinaVerifyService(
      { listPendingByCredential: async () => pending(["s1", "s2"]) },
      tokens,
      tester,
      buildRecord,
    );
    const res = await svc.verifyCredentialBatch("cred_1");
    expect(res.valid).toBe(1);
    expect(res.rows[0]).toMatchObject({ schedinaId: "s1", valid: true });
    expect(res.rows[1]).toMatchObject({
      schedinaId: "s2",
      valid: false,
      errorCod: "12",
      errorDes: "Data di Arrivo Errata",
    });
  });
});
