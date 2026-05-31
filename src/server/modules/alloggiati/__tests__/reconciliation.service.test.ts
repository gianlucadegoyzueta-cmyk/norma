import { describe, expect, it } from "vitest";
import { InMemorySchedinaRepository } from "../adapters/InMemorySchedinaRepository";
import {
  NotImplementedReceiptParser,
  NotImplementedReceiptProvider,
  type ParsedReceipt,
  type ReceiptParser,
  type ReceiptProvider,
} from "../ports/ReceiptParser";
import type { CreateIntentInput } from "../ports/SchedinaRepository";
import { SchedinaReconciliationService } from "../services/reconciliation.service";

const ORG = "org_1";
const CRED = "cred_1";

function intent(numeroDocumento: string, guestId: string): CreateIntentInput {
  return {
    organizationId: ORG,
    credentialId: CRED,
    guestId,
    deadlineAt: new Date("2026-05-31T10:00:00Z"),
    dedup: {
      struttura: CRED,
      idAppartamento: null,
      dataArrivo: "2026-05-30",
      numeroDocumento,
      cognome: "ROSSI",
      nome: "MARIO",
      dataNascita: "1990-05-20",
    },
  };
}

/** Porta una schedina in UNVERIFIED (PENDING→SENDING→UNVERIFIED) usando solo metodi del repo. */
async function makeUnverified(repo: InMemorySchedinaRepository, id: string, snapshot: string) {
  await repo.setPayloadSnapshot(id, snapshot);
  await repo.markSending(id);
  await repo.applyDecision(id, { status: "UNVERIFIED", errorCod: null, errorDes: null });
}

/** Identity-key di test: la riga di tracciato finta È già la chiave. (Il reale userà il tracciato.) */
const identityKey = (snapshot: string) => snapshot;

function fakeProvider(pdf: Uint8Array | null): ReceiptProvider {
  return { fetchReceipt: async () => pdf };
}
function fakeParser(acquired: string[], date = "2026-05-30"): ReceiptParser {
  const receipt: ParsedReceipt = { date, acquiredKeys: new Set(acquired) };
  return { parse: async () => receipt };
}

describe("SchedinaReconciliationService (T+1)", () => {
  it("UNVERIFIED presente in Ricevuta → ACQUIRED", async () => {
    const repo = new InMemorySchedinaRepository();
    const { schedina } = await repo.createIntent(intent("DOC-A", "g1"));
    await makeUnverified(repo, schedina.id, "RIGA-A");

    const svc = new SchedinaReconciliationService(
      repo,
      fakeProvider(new Uint8Array([1])),
      fakeParser(["RIGA-A"]),
      identityKey,
    );
    const report = await svc.reconcileCredential(CRED, "2026-05-30");

    expect(report.confirmedAcquired).toBe(1);
    expect(report.stillUnverified).toBe(0);
    expect((await repo.findById(schedina.id, ORG))?.status).toBe("ACQUIRED");
  });

  it("UNVERIFIED ASSENTE dalla Ricevuta → di default RESTA UNVERIFIED (no re-queue cieco)", async () => {
    const repo = new InMemorySchedinaRepository();
    const { schedina } = await repo.createIntent(intent("DOC-B", "g1"));
    await makeUnverified(repo, schedina.id, "RIGA-B");

    const svc = new SchedinaReconciliationService(
      repo,
      fakeProvider(new Uint8Array([1])),
      fakeParser([]), // ricevuta vuota: la riga non c'è
      identityKey,
    );
    const report = await svc.reconcileCredential(CRED, "2026-05-30");

    expect(report.confirmedAcquired).toBe(0);
    expect(report.requeuedPending).toBe(0);
    expect(report.stillUnverified).toBe(1);
    expect((await repo.findById(schedina.id, ORG))?.status).toBe("UNVERIFIED");
  });

  it("OPT-IN requeueNotFound: assente dalla Ricevuta → PENDING (ri-accodata)", async () => {
    const repo = new InMemorySchedinaRepository();
    const { schedina } = await repo.createIntent(intent("DOC-C", "g1"));
    await makeUnverified(repo, schedina.id, "RIGA-C");

    const svc = new SchedinaReconciliationService(
      repo,
      fakeProvider(new Uint8Array([1])),
      fakeParser([]),
      identityKey,
      { requeueNotFound: true },
    );
    const report = await svc.reconcileCredential(CRED, "2026-05-30");

    expect(report.requeuedPending).toBe(1);
    expect((await repo.findById(schedina.id, ORG))?.status).toBe("PENDING");
  });

  it("Ricevuta non disponibile → nulla cambia, tutte restano UNVERIFIED", async () => {
    const repo = new InMemorySchedinaRepository();
    const { schedina } = await repo.createIntent(intent("DOC-D", "g1"));
    await makeUnverified(repo, schedina.id, "RIGA-D");

    const svc = new SchedinaReconciliationService(
      repo,
      fakeProvider(null), // nessuna ricevuta per quel giorno
      fakeParser(["RIGA-D"]),
      identityKey,
    );
    const report = await svc.reconcileCredential(CRED, "2026-05-30");

    expect(report.receiptDate).toBeNull();
    expect(report.stillUnverified).toBe(1);
    expect((await repo.findById(schedina.id, ORG))?.status).toBe("UNVERIFIED");
  });

  it("nessuna schedina UNVERIFIED → report a zero, nessun download", async () => {
    const repo = new InMemorySchedinaRepository();
    let fetched = false;
    const provider: ReceiptProvider = {
      fetchReceipt: async () => {
        fetched = true;
        return null;
      },
    };
    const svc = new SchedinaReconciliationService(repo, provider, fakeParser([]), identityKey);
    const report = await svc.reconcileCredential(CRED, "2026-05-30");
    expect(report.checked).toBe(0);
    expect(fetched).toBe(false);
  });

  it("scaffold: parser/provider NON implementati FALLISCONO in modo esplicito", async () => {
    expect(() => new NotImplementedReceiptParser().parse()).toThrow(/non ancora implementato/);
    expect(() => new NotImplementedReceiptProvider().fetchReceipt()).toThrow(
      /non ancora implementato/,
    );
  });
});
