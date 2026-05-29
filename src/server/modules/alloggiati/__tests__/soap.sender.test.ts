import { SchedinaStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { InMemorySchedinaRepository } from "../adapters/InMemorySchedinaRepository";
import {
  SoapAlloggiatiSender,
  type SendClient,
  type TokenProvider,
} from "../adapters/SoapAlloggiatiSender";
import type { SendBatch } from "../ports/AlloggiatiSender";
import type { CreateIntentInput } from "../ports/SchedinaRepository";
import type { SendOutcome } from "../soap/client";
import { AlloggiatiProtocolError, AlloggiatiTransientError } from "../soap/errors";
import { SchedinaOutboxService } from "../services/outbox.service";

const CRED = "cred_1";

const tokens: TokenProvider = {
  getToken: async () => ({ utente: "XX1", token: "TOK" }),
};

function clientReturning(o: SendOutcome): SendClient {
  return { send: async () => o };
}
function clientThrowing(err: Error): SendClient {
  return {
    send: async () => {
      throw err;
    },
  };
}

/** Costruisce un SendOutcome come quello del client SOAP. */
function outcome(
  overall: boolean,
  righe: Array<{ esito: boolean; errorCod?: string; errorDes?: string }>,
): SendOutcome {
  return {
    overall: { esito: overall },
    schedineValide: righe.filter((r) => r.esito).length,
    righe: righe.map((r, index) => ({ index, ...r })),
  };
}

function batch(...correlationIds: string[]): SendBatch {
  return {
    credentialId: CRED,
    rows: correlationIds.map((correlationId) => ({ correlationId, record: "R".repeat(168) })),
  };
}

describe("SoapAlloggiatiSender", () => {
  it("usa utente+token della credenziale e trasmette i record", async () => {
    let seen: { utente: string; token: string; righe: readonly string[] } | undefined;
    const client: SendClient = {
      send: async (utente, token, righe) => {
        seen = { utente, token, righe };
        return outcome(true, [{ esito: true }]);
      },
    };
    await new SoapAlloggiatiSender(tokens, client).send(batch("s1"));
    expect(seen).toMatchObject({ utente: "XX1", token: "TOK" });
    expect(seen?.righe).toHaveLength(1);
  });

  it("tutte acquisite → ACQUIRED per ogni correlationId, in ordine", async () => {
    const sender = new SoapAlloggiatiSender(
      tokens,
      clientReturning(outcome(true, [{ esito: true }, { esito: true }])),
    );
    const res = await sender.send(batch("s1", "s2"));
    expect(res.results).toEqual([
      { correlationId: "s1", outcome: "ACQUIRED" },
      { correlationId: "s2", outcome: "ACQUIRED" },
    ]);
  });

  it("misto: mappa per indice ACQUIRED/REJECTED con errorCod/errorDes", async () => {
    const sender = new SoapAlloggiatiSender(
      tokens,
      clientReturning(
        outcome(true, [{ esito: true }, { esito: false, errorCod: "12", errorDes: "Data errata" }]),
      ),
    );
    const res = await sender.send(batch("s1", "s2"));
    expect(res.results[0]).toEqual({ correlationId: "s1", outcome: "ACQUIRED" });
    expect(res.results[1]).toEqual({
      correlationId: "s2",
      outcome: "REJECTED",
      errorCod: "12",
      errorDes: "Data errata",
    });
  });

  it("esito complessivo false → LANCIA (niente esito dedotto)", async () => {
    const sender = new SoapAlloggiatiSender(tokens, clientReturning(outcome(false, [])));
    await expect(sender.send(batch("s1"))).rejects.toBeInstanceOf(AlloggiatiProtocolError);
  });

  it("numero di dettagli ≠ schedine inviate → LANCIA (risposta ambigua)", async () => {
    // 1 dettaglio per 2 schedine inviate: non correlabile in sicurezza.
    const sender = new SoapAlloggiatiSender(
      tokens,
      clientReturning(outcome(true, [{ esito: true }])),
    );
    await expect(sender.send(batch("s1", "s2"))).rejects.toBeInstanceOf(AlloggiatiProtocolError);
  });

  it("errore transitorio del client si propaga (mai inghiottito)", async () => {
    const sender = new SoapAlloggiatiSender(
      tokens,
      clientThrowing(new AlloggiatiTransientError("timeout")),
    );
    await expect(sender.send(batch("s1"))).rejects.toBeInstanceOf(AlloggiatiTransientError);
  });
});

// L'adapter reale, inserito nell'outbox, deve produrre gli stessi stati del Fake.
describe("SoapAlloggiatiSender + outbox (composizione)", () => {
  function intent(): CreateIntentInput {
    return {
      organizationId: "org_1",
      credentialId: CRED,
      guestId: "g1",
      deadlineAt: new Date("2026-06-02T10:00:00Z"),
      dedup: {
        struttura: CRED,
        idAppartamento: null,
        dataArrivo: "2026-06-01",
        numeroDocumento: "AB1234567",
        cognome: "Rossi",
        nome: "Mario",
        dataNascita: "1990-05-20",
      },
    };
  }

  it("acquisizione → schedina ACQUIRED", async () => {
    const repo = new InMemorySchedinaRepository();
    const id = (await repo.createIntent(intent())).schedina.id;
    const sender = new SoapAlloggiatiSender(
      tokens,
      clientReturning(outcome(true, [{ esito: true }])),
    );
    await new SchedinaOutboxService(repo, sender, () => "R".repeat(168)).processCredentialBatch(
      CRED,
    );
    expect((await repo.findById(id))?.status).toBe(SchedinaStatus.ACQUIRED);
  });

  it("risposta ambigua → schedina UNVERIFIED (mai doppio invio)", async () => {
    const repo = new InMemorySchedinaRepository();
    const id = (await repo.createIntent(intent())).schedina.id;
    const sender = new SoapAlloggiatiSender(tokens, clientReturning(outcome(false, [])));
    await new SchedinaOutboxService(repo, sender, () => "R".repeat(168)).processCredentialBatch(
      CRED,
    );
    expect((await repo.findById(id))?.status).toBe(SchedinaStatus.UNVERIFIED);
  });
});
