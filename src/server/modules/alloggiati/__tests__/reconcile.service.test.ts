import { describe, expect, it } from "vitest";
import { buildTracciatoRecord } from "../domain/tracciato";
import { InMemorySchedinaRepository } from "../adapters/InMemorySchedinaRepository";
import type { AcquisitionReceiptReader, AcquiredIdentity } from "../ports/AcquisitionReceiptReader";
import type { CreateIntentInput } from "../ports/SchedinaRepository";
import { SchedinaReconcileService } from "../services/reconcile.service";

/**
 * Test unitario della riconciliazione T+1 (SchedinaReconcileService) — la state machine reale,
 * con un AcquisitionReceiptReader finto (niente PDF/rete). Verifica l'invariante di sicurezza:
 *  - identità presente in Ricevuta → UNVERIFIED → ACQUIRED (l'invio era andato a buon fine);
 *  - identità ASSENTE              → UNVERIFIED → PENDING (re-inviabile in sicurezza, no doppione).
 */

const ORG = "org_1";
const CRED = "cred_1";
const DATE = "2026-05-30";

/** Record di tracciato reale per un ospite (così parseIdentityFromRecord ricava cognome/nome/nascita). */
function record(cognome: string, nome: string, dataNascita: string): string {
  return buildTracciatoRecord({
    tipoAlloggiato: "OSPITE_SINGOLO",
    dataArrivo: DATE,
    giorniPermanenza: 2,
    cognome,
    nome,
    sesso: "M",
    dataNascita,
    statoNascitaCode: "100000100",
    cittadinanzaCode: "100000100",
    comuneNascitaCode: "058091001",
    provinciaNascita: "RM",
    tipoDocumentoCode: "IDELE",
    numeroDocumento: "AB1234567",
    luogoRilascioCode: "058091001",
  });
}

function intent(numeroDocumento: string, guestId: string): CreateIntentInput {
  return {
    organizationId: ORG,
    credentialId: CRED,
    guestId,
    deadlineAt: new Date("2026-05-31T10:00:00Z"),
    dedup: {
      struttura: CRED,
      idAppartamento: null,
      dataArrivo: DATE,
      numeroDocumento,
      cognome: "ROSSI",
      nome: "MARIO",
      dataNascita: "1990-05-20",
    },
  };
}

/** Porta una schedina in UNVERIFIED salvando lo snapshot del tracciato (serve al match nominativo). */
async function makeUnverified(repo: InMemorySchedinaRepository, id: string, rec: string) {
  await repo.setPayloadSnapshot(id, rec);
  await repo.markSending(id);
  await repo.applyDecision(id, { status: "UNVERIFIED", errorCod: null, errorDes: null });
}

/** Reader finto: ritorna le identità "acquisite" passate dal test. */
function fakeReader(acquired: AcquiredIdentity[]): AcquisitionReceiptReader {
  return { acquiredOn: async () => acquired };
}

describe("SchedinaReconcileService (T+1)", () => {
  it("UNVERIFIED presente in Ricevuta → ACQUIRED", async () => {
    const repo = new InMemorySchedinaRepository();
    const { schedina } = await repo.createIntent(intent("DOC-A", "g1"));
    await makeUnverified(repo, schedina.id, record("ROSSI", "MARIO", "1990-05-20"));

    const svc = new SchedinaReconcileService(
      repo,
      fakeReader([{ cognome: "ROSSI", nome: "MARIO", dataNascita: "1990-05-20" }]),
    );
    const res = await svc.reconcileCredential(CRED, DATE);

    expect(res.confirmed).toBe(1);
    expect(res.requeued).toBe(0);
    expect((await repo.findById(schedina.id, ORG))?.status).toBe("ACQUIRED");
  });

  it("UNVERIFIED ASSENTE dalla Ricevuta → PENDING (ri-accodata, re-inviabile in sicurezza)", async () => {
    const repo = new InMemorySchedinaRepository();
    const { schedina } = await repo.createIntent(intent("DOC-B", "g1"));
    await makeUnverified(repo, schedina.id, record("BIANCHI", "LUCA", "1980-01-15"));

    const svc = new SchedinaReconcileService(repo, fakeReader([])); // ricevuta vuota
    const res = await svc.reconcileCredential(CRED, DATE);

    expect(res.confirmed).toBe(0);
    expect(res.requeued).toBe(1);
    expect((await repo.findById(schedina.id, ORG))?.status).toBe("PENDING");
  });

  it("batch misto: una confermata, una ri-accodata", async () => {
    const repo = new InMemorySchedinaRepository();
    const a = await repo.createIntent(intent("DOC-OK", "g1"));
    const b = await repo.createIntent(intent("DOC-KO", "g2"));
    await makeUnverified(repo, a.schedina.id, record("ROSSI", "MARIO", "1990-05-20"));
    await makeUnverified(repo, b.schedina.id, record("VERDI", "GIULIA", "1992-11-03"));

    const svc = new SchedinaReconcileService(
      repo,
      fakeReader([{ cognome: "ROSSI", nome: "MARIO", dataNascita: "1990-05-20" }]), // solo A
    );
    const res = await svc.reconcileCredential(CRED, DATE);

    expect(res.total).toBe(2);
    expect(res.confirmed).toBe(1);
    expect(res.requeued).toBe(1);
    expect((await repo.findById(a.schedina.id, ORG))?.status).toBe("ACQUIRED");
    expect((await repo.findById(b.schedina.id, ORG))?.status).toBe("PENDING");
  });

  it("nessuna schedina UNVERIFIED → report a zero, nessuna lettura della Ricevuta", async () => {
    const repo = new InMemorySchedinaRepository();
    let read = false;
    const reader: AcquisitionReceiptReader = {
      acquiredOn: async () => {
        read = true;
        return [];
      },
    };
    const res = await new SchedinaReconcileService(repo, reader).reconcileCredential(CRED, DATE);
    expect(res.total).toBe(0);
    expect(read).toBe(false);
  });
});
