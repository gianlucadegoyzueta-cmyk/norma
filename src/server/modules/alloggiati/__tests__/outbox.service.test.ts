import { SchedinaStatus } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { FakeAlloggiatiSender } from "../adapters/FakeAlloggiatiSender";
import { InMemorySchedinaRepository } from "../adapters/InMemorySchedinaRepository";
import type { CreateIntentInput } from "../ports/SchedinaRepository";
import { SchedinaOutboxService } from "../services/outbox.service";

const ORG = "org_1";
const CRED = "cred_1";

function intent(
  overrides: Partial<CreateIntentInput["dedup"]> = {},
  guestId = "g1",
): CreateIntentInput {
  return {
    organizationId: ORG,
    credentialId: CRED,
    guestId,
    deadlineAt: new Date("2026-06-02T10:00:00Z"),
    dedup: {
      struttura: CRED,
      idAppartamento: null,
      dataArrivo: "2026-06-01",
      numeroDocumento: "AB1234567",
      cognome: "Rossi",
      nome: "Mario",
      dataNascita: "1990-05-20",
      ...overrides,
    },
  };
}

describe("anti-doppione (livello applicativo)", () => {
  it("due intenti identici → una sola schedina (il secondo ritorna l'esistente)", async () => {
    const repo = new InMemorySchedinaRepository();
    const a = await repo.createIntent(intent({}, "g1"));
    // stesso ospite inserito due volte (doppia battitura): guest diverso, dati identici
    const b = await repo.createIntent(intent({}, "g2"));

    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.schedina.id).toBe(a.schedina.id);
  });

  it("ospiti diversi → schedine diverse", async () => {
    const repo = new InMemorySchedinaRepository();
    const a = await repo.createIntent(intent({ numeroDocumento: "AAA" }, "g1"));
    const b = await repo.createIntent(intent({ numeroDocumento: "BBB" }, "g2"));
    expect(a.schedina.id).not.toBe(b.schedina.id);
  });
});

describe("SchedinaOutboxService — orchestrazione", () => {
  let repo: InMemorySchedinaRepository;
  let sender: FakeAlloggiatiSender;
  let service: SchedinaOutboxService;
  let schedinaId: string;

  beforeEach(async () => {
    repo = new InMemorySchedinaRepository();
    sender = new FakeAlloggiatiSender();
    service = new SchedinaOutboxService(repo, sender);
    schedinaId = (await repo.createIntent(intent())).schedina.id;
  });

  it("percorso felice: PENDING → SENDING → ACQUIRED", async () => {
    sender.setBehaviour({ mode: "all-acquired" });
    await service.processCredentialBatch(CRED);
    expect((await repo.findById(schedinaId, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
    expect(sender.calls).toHaveLength(1);
  });

  it("rifiuto: PENDING → SENDING → REJECTED", async () => {
    sender.setBehaviour({
      mode: "all-rejected",
      errorCod: "12",
      errorDes: "Data di Arrivo Errata",
    });
    await service.processCredentialBatch(CRED);
    expect((await repo.findById(schedinaId, ORG))?.status).toBe(SchedinaStatus.REJECTED);
  });

  it("timeout/nessuna risposta: PENDING → SENDING → UNVERIFIED (mai doppio invio)", async () => {
    sender.setBehaviour({ mode: "throw" });
    await service.processCredentialBatch(CRED);
    expect((await repo.findById(schedinaId, ORG))?.status).toBe(SchedinaStatus.UNVERIFIED);
  });

  it("non invia nulla se non ci sono schedine PENDING", async () => {
    await service.processCredentialBatch("credenziale-senza-schedine");
    expect(sender.calls).toHaveLength(0);
  });

  it("recoverStaleSending: SENDING abbandonato → UNVERIFIED", async () => {
    await repo.claimForSending(schedinaId);
    repo.setSentAtForTest(schedinaId, new Date(0));
    expect(await repo.recoverStaleSending(CRED, 60_000)).toBe(1);
    expect((await repo.findById(schedinaId, ORG))?.status).toBe(SchedinaStatus.UNVERIFIED);
  });
});

describe("SchedinaOutboxService — concorrenza (claim atomico anti-doppio-invio)", () => {
  /**
   * Sender che CEDE il controllo (await su un gate) dopo aver registrato la chiamata, così due
   * processCredentialBatch in volo si interlacciano DAVVERO. Senza claim atomico, entrambi
   * leggerebbero la stessa PENDING e la invierebbero → doppione. Col claim, una sola vince.
   */
  it("due batch paralleli sulla stessa credenziale → UN SOLO invio della riga (no doppione)", async () => {
    const repo = new InMemorySchedinaRepository();
    const { schedina } = await repo.createIntent(intent());

    let release!: () => void;
    const gate = new Promise<void>((res) => {
      release = res;
    });
    let sends = 0;
    const sentCorrelationIds: string[] = [];
    const slowSender = {
      async send(batch: { rows: { correlationId: string }[] }) {
        sends += 1;
        for (const r of batch.rows) sentCorrelationIds.push(r.correlationId);
        await gate; // entrambi i batch arrivano qui prima che uno qualunque completi
        return {
          results: batch.rows.map((r) => ({
            correlationId: r.correlationId,
            outcome: "ACQUIRED" as const,
          })),
        };
      },
    };
    const service = new SchedinaOutboxService(repo, slowSender);

    // Avvia due batch in parallelo; sblocca il gate quando sono entrambi "in volo".
    const p1 = service.processCredentialBatch(CRED);
    const p2 = service.processCredentialBatch(CRED);
    await Promise.resolve(); // lascia girare i microtask fino al claim
    release();
    await Promise.all([p1, p2]);

    // Solo UNA delle due esecuzioni ha potuto rivendicare e inviare la riga.
    expect(sends).toBe(1);
    expect(sentCorrelationIds).toEqual([schedina.id]);
    expect((await repo.findById(schedina.id, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
  });

  it("claimForSending è one-shot: il secondo claim sulla stessa riga ritorna false", async () => {
    const repo = new InMemorySchedinaRepository();
    const { schedina } = await repo.createIntent(intent());
    expect(await repo.claimForSending(schedina.id)).toBe(true);
    expect(await repo.claimForSending(schedina.id)).toBe(false); // già SENDING
  });
});
