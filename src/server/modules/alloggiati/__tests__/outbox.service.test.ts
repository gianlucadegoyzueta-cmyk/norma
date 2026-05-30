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
});
