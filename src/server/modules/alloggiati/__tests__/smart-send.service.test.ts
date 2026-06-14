import { SchedinaStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { InMemorySchedinaRepository } from "../adapters/InMemorySchedinaRepository";
import type { CreateIntentInput } from "../ports/SchedinaRepository";
import { type SmartSendDeps, verifyParkAndSend } from "../services/smart-send.service";
import type { VerifyBatchResult } from "../services/verify.service";

// ---- smart-send (Test-gate) con deps finte: la logica dell'intelligenza, senza rete/DB ----

function verifyResult(rows: { id: string; valid: boolean }[]): VerifyBatchResult {
  return {
    total: rows.length,
    valid: rows.filter((r) => r.valid).length,
    rows: rows.map((r) => ({ schedinaId: r.id, valid: r.valid })),
  };
}

describe("verifyParkAndSend (Test-gate)", () => {
  it("tutte valide → invia, niente parcheggio", async () => {
    const parkedWith: string[][] = [];
    let sendCalls = 0;
    const deps: SmartSendDeps = {
      verify: async () =>
        verifyResult([
          { id: "a", valid: true },
          { id: "b", valid: true },
        ]),
      parkByIds: async (ids) => (parkedWith.push([...ids]), ids.length),
      send: async () => void (sendCalls += 1),
    };
    const out = await verifyParkAndSend(deps, "cred_1");
    expect(out.tested).toBe(2);
    expect(out.parked).toBe(0);
    expect(out.sentBatch).toBe(true);
    expect(sendCalls).toBe(1);
    expect(parkedWith).toHaveLength(0);
  });

  it("alcune bocciate → parcheggia SOLO le bocciate, invia comunque le valide", async () => {
    const parkedWith: string[][] = [];
    let sendCalls = 0;
    const deps: SmartSendDeps = {
      verify: async () =>
        verifyResult([
          { id: "ok", valid: true },
          { id: "bad", valid: false },
        ]),
      parkByIds: async (ids) => (parkedWith.push([...ids]), ids.length),
      send: async () => void (sendCalls += 1),
    };
    const out = await verifyParkAndSend(deps, "cred_1");
    expect(out.parked).toBe(1);
    expect(parkedWith).toEqual([["bad"]]);
    expect(out.sentBatch).toBe(true);
    expect(sendCalls).toBe(1);
  });

  it("tutte bocciate → parcheggia tutte, NON invia", async () => {
    let sendCalls = 0;
    const parkedWith: string[][] = [];
    const deps: SmartSendDeps = {
      verify: async () =>
        verifyResult([
          { id: "x", valid: false },
          { id: "y", valid: false },
        ]),
      parkByIds: async (ids) => (parkedWith.push([...ids]), ids.length),
      send: async () => void (sendCalls += 1),
    };
    const out = await verifyParkAndSend(deps, "cred_1");
    expect(out.parked).toBe(2);
    expect(out.sentBatch).toBe(false);
    expect(sendCalls).toBe(0);
  });

  it("nessuna PENDING → niente parcheggio, niente invio", async () => {
    let sendCalls = 0;
    const deps: SmartSendDeps = {
      verify: async () => verifyResult([]),
      parkByIds: async () => 0,
      send: async () => void (sendCalls += 1),
    };
    const out = await verifyParkAndSend(deps, "cred_1");
    expect(out.tested).toBe(0);
    expect(out.sentBatch).toBe(false);
    expect(sendCalls).toBe(0);
  });
});

// ---- parkByIds (InMemory): parcheggia solo le PENDING indicate, idempotente ----

const ORG = "org_1";
const CRED = "cred_1";
function intent(guestId: string): CreateIntentInput {
  return {
    organizationId: ORG,
    credentialId: CRED,
    guestId,
    deadlineAt: new Date("2026-06-02T10:00:00Z"),
    dedup: {
      struttura: CRED,
      idAppartamento: null,
      dataArrivo: "2026-06-01",
      numeroDocumento: `DOC-${guestId}`,
      cognome: "Rossi",
      nome: "Mario",
      dataNascita: "1990-05-20",
    },
  };
}

describe("SchedinaRepository.parkByIds (InMemory)", () => {
  it("parcheggia solo le PENDING tra gli id, lascia le altre, è idempotente", async () => {
    const repo = new InMemorySchedinaRepository();
    const a = (await repo.createIntent(intent("g1"))).schedina.id;
    const b = (await repo.createIntent(intent("g2"))).schedina.id;

    const parked = await repo.parkByIds([a]);
    expect(parked).toBe(1);
    expect((await repo.findById(a, ORG))?.status).toBe(SchedinaStatus.NEEDS_REVIEW);
    expect((await repo.findById(b, ORG))?.status).toBe(SchedinaStatus.PENDING);

    // Idempotente: a non è più PENDING → 0; id sconosciuto → 0.
    expect(await repo.parkByIds([a])).toBe(0);
    expect(await repo.parkByIds(["nope"])).toBe(0);
  });
});
