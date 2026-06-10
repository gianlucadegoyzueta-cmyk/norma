import { describe, expect, it } from "vitest";
import { InMemorySchedinaRepository } from "../adapters/InMemorySchedinaRepository";
import type { RicevutaSummary } from "../domain/ricevuta-summary";
import type { RicevutaSummaryReader } from "../ports/RicevutaSummaryReader";
import type { CreateIntentInput } from "../ports/SchedinaRepository";
import { SchedinaReconcileService } from "../services/reconcile.service";

/**
 * Test unitario della riconciliazione T+1 PER CONTEGGIO (SchedinaReconcileService) — la state
 * machine reale con un RicevutaSummaryReader finto (niente PDF/rete). Verifica le invarianti:
 *  - attese === inviate    → MATCH     → UNVERIFIED → ACQUIRED;
 *  - ricevuta vuota / null → NONE_SENT → UNVERIFIED → PENDING (re-inviabili, no doppione);
 *  - attese !== inviate >0 → MISMATCH  → UNVERIFIED → NEEDS_REVIEW (intero batch a revisione).
 */

const ORG = "org_1";
const CRED = "cred_1";
const DATE = "2026-05-30";

let seq = 0;
function intent(): CreateIntentInput {
  seq += 1;
  return {
    organizationId: ORG,
    credentialId: CRED,
    guestId: `g${seq}`,
    deadlineAt: new Date("2026-05-31T10:00:00Z"),
    dedup: {
      struttura: CRED,
      idAppartamento: null,
      dataArrivo: DATE,
      numeroDocumento: `DOC-${seq}`,
      cognome: "ROSSI",
      nome: "MARIO",
      dataNascita: "1990-05-20",
    },
  };
}

/** Crea N schedine e le porta in UNVERIFIED. Ritorna gli id. */
async function seedUnverified(repo: InMemorySchedinaRepository, n: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const { schedina } = await repo.createIntent(intent());
    await repo.markSending(schedina.id);
    await repo.applyDecision(schedina.id, { status: "UNVERIFIED", errorCod: null, errorDes: null });
    ids.push(schedina.id);
  }
  return ids;
}

/** Reader finto: ritorna un riepilogo con il conteggio dato (o null = nessuna ricevuta). */
function fakeReader(schedineInviate: number | null): RicevutaSummaryReader {
  return {
    summaryOn: async (): Promise<RicevutaSummary | null> => {
      if (schedineInviate === null) return null;
      return {
        login: CRED,
        categoria: null,
        struttura: null,
        comune: null,
        indirizzo: null,
        pivaCodiceFiscale: null,
        idRicevuta: "2026/1 [RM]",
        dataInvio: DATE,
        schedineInviate,
        ggPermanenzaTotale: null,
        questura: "ROMA",
      };
    },
  };
}

describe("SchedinaReconcileService (T+1, per conteggio)", () => {
  it("attese === inviate → MATCH → tutte ACQUIRED", async () => {
    const repo = new InMemorySchedinaRepository();
    const ids = await seedUnverified(repo, 3);

    const res = await new SchedinaReconcileService(repo, fakeReader(3)).reconcileCredential(
      CRED,
      DATE,
    );

    expect(res.verdict).toBe("MATCH");
    expect(res.expected).toBe(3);
    expect(res.reported).toBe(3);
    expect(res.confirmed).toBe(3);
    expect(res.requeued).toBe(0);
    expect(res.review).toBe(0);
    for (const id of ids) {
      expect((await repo.findById(id, ORG))?.status).toBe("ACQUIRED");
    }
  });

  it("ricevuta vuota (0 inviate) → NONE_SENT → tutte PENDING (re-inviabili)", async () => {
    const repo = new InMemorySchedinaRepository();
    const ids = await seedUnverified(repo, 2);

    const res = await new SchedinaReconcileService(repo, fakeReader(0)).reconcileCredential(
      CRED,
      DATE,
    );

    expect(res.verdict).toBe("NONE_SENT");
    expect(res.requeued).toBe(2);
    for (const id of ids) {
      expect((await repo.findById(id, ORG))?.status).toBe("PENDING");
    }
  });

  it("nessuna ricevuta per quel giorno (null) → NONE_SENT → tutte PENDING", async () => {
    const repo = new InMemorySchedinaRepository();
    const ids = await seedUnverified(repo, 2);

    const res = await new SchedinaReconcileService(repo, fakeReader(null)).reconcileCredential(
      CRED,
      DATE,
    );

    expect(res.verdict).toBe("NONE_SENT");
    expect(res.reported).toBe(0);
    expect(res.requeued).toBe(2);
    for (const id of ids) {
      expect((await repo.findById(id, ORG))?.status).toBe("PENDING");
    }
  });

  it("inviate < attese (ma > 0) → MISMATCH → intero batch in NEEDS_REVIEW", async () => {
    const repo = new InMemorySchedinaRepository();
    const ids = await seedUnverified(repo, 3);

    const res = await new SchedinaReconcileService(repo, fakeReader(2)).reconcileCredential(
      CRED,
      DATE,
    );

    expect(res.verdict).toBe("MISMATCH");
    expect(res.expected).toBe(3);
    expect(res.reported).toBe(2);
    expect(res.review).toBe(3);
    expect(res.confirmed).toBe(0);
    expect(res.requeued).toBe(0);
    for (const id of ids) {
      expect((await repo.findById(id, ORG))?.status).toBe("NEEDS_REVIEW");
    }
  });

  it("inviate > attese → MISMATCH → intero batch in NEEDS_REVIEW (conservativo)", async () => {
    const repo = new InMemorySchedinaRepository();
    const ids = await seedUnverified(repo, 2);

    const res = await new SchedinaReconcileService(repo, fakeReader(5)).reconcileCredential(
      CRED,
      DATE,
    );

    expect(res.verdict).toBe("MISMATCH");
    expect(res.review).toBe(2);
    for (const id of ids) {
      expect((await repo.findById(id, ORG))?.status).toBe("NEEDS_REVIEW");
    }
  });

  it("nessuna schedina UNVERIFIED → report a zero, nessuna lettura della Ricevuta", async () => {
    const repo = new InMemorySchedinaRepository();
    let read = false;
    const reader: RicevutaSummaryReader = {
      summaryOn: async () => {
        read = true;
        return null;
      },
    };
    const res = await new SchedinaReconcileService(repo, reader).reconcileCredential(CRED, DATE);
    expect(res.total).toBe(0);
    expect(res.verdict).toBe("NONE_SENT");
    expect(read).toBe(false);
  });
});
