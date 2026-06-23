// =====================================================================================
// SUITE END-TO-END contro il MOCK server SOAP di Alloggiati Web.
//
// Esercita il flusso reale completo — genera → verifica (Test) → invia (Send) → conferma stato —
// attraverso lo STACK DI PRODUZIONE invariato (client SOAP, token manager, sender, outbox, verify),
// con l'unica sostituzione del `fetchImpl` puntato al mock. NESSUNA chiamata al sistema reale.
//
// Scenari coperti (richiesti):
//  1. invio accettato (con conteggio "schedine valide" come proxy di ricevuta)
//  2. schedina rifiutata per dato non valido (cod. 11 formato, cod. 12 data fuori finestra)
//  3. credenziali non valide
//  4. timeout / nessuna risposta (incl. il caso critico: acquisito lato server, risposta persa)
//  5. doppio invio della stessa schedina (verifica la PROTEZIONE lato nostro)
// + casi-limite reali: ospite straniero, gruppo familiare (capo+membro), data fuori finestra,
//   tipo documento raro.
// =====================================================================================

import { SchedinaStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import type { AlloggiatiSecret } from "../../../secrets";
import { buildTracciatoRecord } from "../domain/tracciato";
import type { CreateIntentInput } from "../ports/SchedinaRepository";
import { AlloggiatiAuthError, AlloggiatiReceiptError } from "../soap/errors";
import { AlloggiatiMockServer } from "./mocks/AlloggiatiMockServer";
import { createAlloggiatiStack, type AlloggiatiStack } from "./mocks/harness";

const ORG = "org_1";
const CRED = "cred_1";
const SECRET: AlloggiatiSecret = {
  utente: "NA0001",
  password: "pw-corretta",
  wskey: "ws-corretta",
};

// Finestra Data di Arrivo deterministica (il portale accetta solo OGGI o IERI).
const TODAY = "2026-05-30";
const YESTERDAY = "2026-05-29";
const FUORI_FINESTRA = "2026-01-01";

// ----------------------------- costruttori di record (tracciato reale, puro) -----------------------------

/** Ospite singolo italiano "pulito" (in finestra, documento valido). */
function recItalianoOk(dataArrivo = TODAY): string {
  return buildTracciatoRecord({
    tipoAlloggiato: "OSPITE_SINGOLO",
    dataArrivo,
    giorniPermanenza: 3,
    cognome: "ROSSI",
    nome: "MARIO",
    sesso: "M",
    dataNascita: "1990-05-20",
    statoNascitaCode: "100000100", // Italia (placeholder 9-char)
    cittadinanzaCode: "100000100",
    comuneNascitaCode: "058091001", // Roma
    provinciaNascita: "RM",
    tipoDocumentoCode: "IDELE",
    numeroDocumento: "AB1234567",
    luogoRilascioCode: "058091001",
  });
}

/** Ospite STRANIERO: nato all'estero (niente comune/provincia), luogo rilascio = Stato estero. */
function recStraniero(): string {
  return buildTracciatoRecord({
    tipoAlloggiato: "OSPITE_SINGOLO",
    dataArrivo: TODAY,
    giorniPermanenza: 5,
    cognome: "MUELLER",
    nome: "HANS",
    sesso: "M",
    dataNascita: "1985-03-12",
    statoNascitaCode: "100000219", // Germania (placeholder 9-char)
    cittadinanzaCode: "100000219",
    // niente comune/provincia → nato all'estero
    tipoDocumentoCode: "PASOR", // passaporto ordinario (placeholder 5-char)
    numeroDocumento: "C01X45678",
    luogoRilascioCode: "100000219",
  });
}

/** Capo famiglia (17, con documento). */
function recCapoFamiglia(): string {
  return buildTracciatoRecord({
    tipoAlloggiato: "CAPO_FAMIGLIA",
    dataArrivo: TODAY,
    giorniPermanenza: 2,
    cognome: "BIANCHI",
    nome: "LUCA",
    sesso: "M",
    dataNascita: "1980-01-15",
    statoNascitaCode: "100000100",
    cittadinanzaCode: "100000100",
    comuneNascitaCode: "058091001",
    provinciaNascita: "RM",
    tipoDocumentoCode: "IDELE",
    numeroDocumento: "CF9988776",
    luogoRilascioCode: "058091001",
  });
}

/** Familiare (19, SENZA documento: i campi documento vanno in bianco — lo impone il tracciato). */
function recFamiliare(): string {
  return buildTracciatoRecord({
    tipoAlloggiato: "FAMILIARE",
    dataArrivo: TODAY,
    giorniPermanenza: 2,
    cognome: "BIANCHI",
    nome: "SOFIA",
    sesso: "F",
    dataNascita: "2015-07-22", // minore al seguito
    statoNascitaCode: "100000100",
    cittadinanzaCode: "100000100",
    comuneNascitaCode: "058091001",
    provinciaNascita: "RM",
  });
}

/** Tipo documento "raro" ma a larghezza valida (5 char): il tracciato lo accetta comunque. */
function recDocumentoRaro(): string {
  return buildTracciatoRecord({
    tipoAlloggiato: "OSPITE_SINGOLO",
    dataArrivo: TODAY,
    giorniPermanenza: 1,
    cognome: "VERDI",
    nome: "GIULIA",
    sesso: "F",
    dataNascita: "1992-11-03",
    statoNascitaCode: "100000100",
    cittadinanzaCode: "100000100",
    comuneNascitaCode: "058091001",
    provinciaNascita: "RM",
    tipoDocumentoCode: "MILIT", // documento militare (raro, placeholder 5-char)
    numeroDocumento: "MIL000123",
    luogoRilascioCode: "058091001",
  });
}

// ----------------------------- helper di setup -----------------------------

let seq = 0;
function intent(dedup: Partial<CreateIntentInput["dedup"]> = {}): CreateIntentInput {
  return {
    organizationId: ORG,
    credentialId: CRED,
    guestId: `g_${++seq}`,
    deadlineAt: new Date("2026-05-31T10:00:00Z"),
    dedup: {
      struttura: CRED,
      idAppartamento: null,
      dataArrivo: TODAY,
      numeroDocumento: `DOC${seq}`,
      cognome: "ROSSI",
      nome: "MARIO",
      dataNascita: "1990-05-20",
      ...dedup,
    },
  };
}

/** Crea una schedina PENDING e registra la sua riga di tracciato nell'harness. */
async function addPending(
  stack: AlloggiatiStack,
  record: string,
  dedup: Partial<CreateIntentInput["dedup"]> = {},
): Promise<string> {
  const { schedina } = await stack.repo.createIntent(intent(dedup));
  stack.records.set(schedina.id, record);
  return schedina.id;
}

// ====================================================================================

describe("Mock Alloggiati — Scenario 1: invio accettato", () => {
  it("PENDING → SENDING → ACQUIRED; il server registra l'acquisizione (proxy di ricevuta)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const record = recItalianoOk();
    const id = await addPending(stack, record);

    await stack.outbox.processCredentialBatch(CRED);

    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
    expect(mock.callCount("Send")).toBe(1);
    expect(mock.acquired.get(record)).toBe(1); // la riga è arrivata e acquisita una sola volta
  });

  it("accetta anche la data di IERI (finestra oggi/ieri)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const id = await addPending(stack, recItalianoOk(YESTERDAY));
    await stack.outbox.processCredentialBatch(CRED);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
  });
});

describe("Mock Alloggiati — Scenario 2: rifiuto per dato non valido", () => {
  it("formato riga errato → cod. 11 → REJECTED (con codice/descrizione persistiti)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    // Record volutamente malformato (lunghezza != 168/174).
    const id = await addPending(stack, "RIGA-TROPPO-CORTA");

    await stack.outbox.processCredentialBatch(CRED);

    const row = await stack.repo.findById(id, ORG);
    expect(row?.status).toBe(SchedinaStatus.REJECTED);
    expect(mock.acquired.size).toBe(0); // niente acquisito
  });

  it("data di arrivo fuori finestra → cod. 12 → REJECTED", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const id = await addPending(stack, recItalianoOk(FUORI_FINESTRA), {
      dataArrivo: FUORI_FINESTRA,
    });

    await stack.outbox.processCredentialBatch(CRED);

    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.REJECTED);
  });

  it("batch misto: una valida → ACQUIRED, una malformata → REJECTED (esiti per-riga 1:1)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const ok = await addPending(stack, recItalianoOk(), { numeroDocumento: "OK1" });
    const ko = await addPending(stack, "MALFORMATA", { numeroDocumento: "KO1" });

    await stack.outbox.processCredentialBatch(CRED);

    expect((await stack.repo.findById(ok, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
    expect((await stack.repo.findById(ko, ORG))?.status).toBe(SchedinaStatus.REJECTED);
  });
});

describe("Mock Alloggiati — Scenario 3: credenziali non valide", () => {
  it("segreto errato → GenerateToken esito false → AlloggiatiAuthError (nessun Send)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const wrong: AlloggiatiSecret = {
      utente: "NA0001",
      password: "SBAGLIATA",
      wskey: "ws-corretta",
    };
    const stack = createAlloggiatiStack({ mock, secret: wrong });
    await addPending(stack, recItalianoOk());

    // L'outbox costruisce le righe, poi GenerateToken fallisce nel sender → l'eccezione propaga.
    await expect(stack.outbox.processCredentialBatch(CRED)).rejects.toBeInstanceOf(
      AlloggiatiAuthError,
    );
    expect(mock.callCount("Send")).toBe(0); // mai inviato nulla senza un token valido
  });

  it("WSKey revocata (forceAuthFailure) → AlloggiatiAuthError", async () => {
    const mock = new AlloggiatiMockServer(SECRET, {
      today: TODAY,
      forceAuthFailure: { errorDes: "WSKey revocata" },
    });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    await expect(stack.client.generateToken(SECRET)).rejects.toBeInstanceOf(AlloggiatiAuthError);
  });
});

describe("Mock Alloggiati — Scenario 4: timeout / nessuna risposta (azione irreversibile)", () => {
  it("timeout sull'INVIO (token già ottenuto) → schedina UNVERIFIED (mai dedotto un esito, mai ritentato alla cieca)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET, timeoutMs: 40 });
    const id = await addPending(stack, recItalianoOk());

    // Pre-autenticazione riuscita (token in cache), POI cade la rete: a fallire è SOLO l'invio
    // vero (Send in timeout) → la schedina è stata marcata SENDING ma l'esito è ignoto → UNVERIFIED.
    await stack.tokens.getToken(CRED);
    mock.setScenario({ today: TODAY, transport: "timeout" });

    await stack.outbox.processCredentialBatch(CRED);

    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.UNVERIFIED);
  });

  it("timeout in PRE-AUTENTICAZIONE (token) → schedina resta PENDING (nulla è stato inviato), errore propagato", async () => {
    // La rete cade PRIMA di ottenere il token: nessun Send parte. La schedina NON va in UNVERIFIED
    // (che significa "inviato, esito ignoto") ma resta PENDING, ri-provabile. L'outbox propaga.
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY, transport: "timeout" });
    const stack = createAlloggiatiStack({ mock, secret: SECRET, timeoutMs: 40 });
    const id = await addPending(stack, recItalianoOk());

    await expect(stack.outbox.processCredentialBatch(CRED)).rejects.toThrow();

    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.PENDING);
    expect(mock.callCount("Send")).toBe(0); // mai inviato nulla senza token
  });

  it("CASO CRITICO: acquisito lato server ma risposta persa → UNVERIFIED (non REJECTED, non ACQUIRED)", async () => {
    // Il server ACQUISISCE davvero, poi la connessione muore: il nostro codice NON può saperlo.
    const mock = new AlloggiatiMockServer(SECRET, {
      today: TODAY,
      dropResponseAfterAcquire: true,
    });
    const stack = createAlloggiatiStack({ mock, secret: SECRET, timeoutMs: 40 });
    const record = recItalianoOk();
    const id = await addPending(stack, record);

    await stack.outbox.processCredentialBatch(CRED);

    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.UNVERIFIED);
    expect(mock.acquired.get(record)).toBe(1); // lato server È stata acquisita: lo riconcilierà T+1
  });
});

describe("Mock Alloggiati — Scenario 5: doppio invio (protezione lato nostro)", () => {
  it("dopo ACQUIRED, un secondo giro NON re-invia (ACQUIRED è terminale, non più PENDING)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const record = recItalianoOk();
    const id = await addPending(stack, record);

    await stack.outbox.processCredentialBatch(CRED);
    await stack.outbox.processCredentialBatch(CRED); // secondo tentativo

    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
    expect(mock.callCount("Send")).toBe(1); // il server ha ricevuto UN SOLO Send
    expect(mock.acquired.get(record)).toBe(1);
  });

  it("dopo UNVERIFIED, un secondo giro NON re-invia (mai retry alla cieca su esito ignoto)", async () => {
    // Round 1: il server ACQUISISCE davvero, ma la risposta si perde → il nostro lato va UNVERIFIED
    // (esito ignoto). Il server ha ricevuto UN Send.
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY, dropResponseAfterAcquire: true });
    const stack = createAlloggiatiStack({ mock, secret: SECRET, timeoutMs: 40 });
    const id = await addPending(stack, recItalianoOk());

    await stack.outbox.processCredentialBatch(CRED);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.UNVERIFIED);
    expect(mock.callCount("Send")).toBe(1);

    // Round 2: la rete torna del tutto. L'outbox processa solo le PENDING → l'UNVERIFIED NON viene
    // ri-inviata (la riconciliazione T+1 è un altro processo). Nessun nuovo Send: resta UNO.
    mock.setScenario({ today: TODAY }); // transport "ok", niente drop
    await stack.outbox.processCredentialBatch(CRED);

    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.UNVERIFIED);
    expect(mock.callCount("Send")).toBe(1);
  });

  it("anti-doppione a monte: due intenti identici → una sola schedina", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const a = await stack.repo.createIntent(intent({ numeroDocumento: "SAME" }));
    const b = await stack.repo.createIntent(intent({ numeroDocumento: "SAME" }));
    expect(a.schedina.id).toBe(b.schedina.id);
    expect(b.created).toBe(false);
  });
});

describe("Mock Alloggiati — Casi-limite reali delle schedine", () => {
  it("ospite straniero (nato all'estero, documento estero) → ACQUIRED", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const id = await addPending(stack, recStraniero(), {
      cognome: "MUELLER",
      numeroDocumento: "C01X45678",
    });
    await stack.outbox.processCredentialBatch(CRED);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
  });

  it("gruppo familiare (capo 17 con doc + familiare 19 senza doc) → entrambi ACQUIRED", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const capo = await addPending(stack, recCapoFamiglia(), {
      cognome: "BIANCHI",
      numeroDocumento: "CF9988776",
    });
    const figlia = await addPending(stack, recFamiliare(), {
      cognome: "BIANCHI",
      nome: "SOFIA",
      numeroDocumento: "", // i familiari non hanno documento nella dedup-key
      dataNascita: "2015-07-22",
    });

    await stack.outbox.processCredentialBatch(CRED);

    expect((await stack.repo.findById(capo, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
    expect((await stack.repo.findById(figlia, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
    expect(mock.callCount("Send")).toBe(1); // un solo batch per la credenziale
  });

  it("tipo documento raro ma a larghezza valida → ACQUIRED (il tracciato non lo discrimina)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const id = await addPending(stack, recDocumentoRaro(), {
      cognome: "VERDI",
      numeroDocumento: "MIL000123",
    });
    await stack.outbox.processCredentialBatch(CRED);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
  });

  it("tipo documento non riconosciuto dal server → REJECTED con codice [MOCK] esplicito", async () => {
    // Il catalogo TipoErrore non è nel repo: il test FORNISCE il codice di rifiuto (non inventato dal mock).
    const mock = new AlloggiatiMockServer(SECRET, {
      today: TODAY,
      rejectRow: (record) =>
        record.includes("MILIT")
          ? { errorCod: "30", errorDes: "[MOCK] Tipo Documento non valido" } // codice non ufficiale
          : null,
    });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const id = await addPending(stack, recDocumentoRaro(), {
      cognome: "VERDI",
      numeroDocumento: "MIL000123",
    });
    await stack.outbox.processCredentialBatch(CRED);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.REJECTED);
  });

  it("data di arrivo fuori finestra come caso-limite esplicito → REJECTED (cod. 12)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    const id = await addPending(stack, recItalianoOk(FUORI_FINESTRA), {
      dataArrivo: FUORI_FINESTRA,
    });
    await stack.outbox.processCredentialBatch(CRED);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.REJECTED);
  });
});

describe("Mock Alloggiati — Scenario 6: riconciliazione T+1 (Ricevuta)", () => {
  const TOMORROW = "2026-05-31";

  it("UNVERIFIED + acquisita lato server → la Ricevuta di T+1 conferma → ACQUIRED", async () => {
    // Round 1 (oggi): il server acquisisce davvero ma la risposta si perde → UNVERIFIED.
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY, dropResponseAfterAcquire: true });
    const stack = createAlloggiatiStack({ mock, secret: SECRET, timeoutMs: 40 });
    const id = await addPending(stack, recItalianoOk(), { numeroDocumento: "REC-1" });

    await stack.outbox.processCredentialBatch(CRED);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.UNVERIFIED);

    // Round 2 (domani): la Ricevuta del giorno dell'invio è ora interrogabile e contiene l'identità.
    mock.setScenario({ today: TOMORROW });
    const result = await stack.reconcile.reconcileCredential(CRED, TODAY);

    expect(result.confirmed).toBe(1);
    expect(result.requeued).toBe(0);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
    expect(mock.callCount("Send")).toBe(1); // mai re-inviata: confermata dalla ricevuta
  });

  it("UNVERIFIED ma NON acquisita (timeout prima dell'acquisizione) → Ricevuta vuota → torna PENDING e si può re-inviare", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET, timeoutMs: 40 });
    const record = recItalianoOk();
    const id = await addPending(stack, record, { numeroDocumento: "REC-2" });

    // Token già in cache, poi la rete cade sull'INVIO → niente acquisito lato server, schedina UNVERIFIED.
    await stack.tokens.getToken(CRED);
    mock.setScenario({ today: TODAY, transport: "timeout" });
    await stack.outbox.processCredentialBatch(CRED);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.UNVERIFIED);

    // T+1: la ricevuta del giorno NON contiene l'identità → ri-accodata come PENDING.
    mock.setScenario({ today: TOMORROW });
    const result = await stack.reconcile.reconcileCredential(CRED, TODAY);

    expect(result.confirmed).toBe(0);
    expect(result.requeued).toBe(1);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.PENDING);

    // Ora il re-invio è SICURO (non era stata acquisita): un nuovo giro la porta ad ACQUIRED.
    await stack.outbox.processCredentialBatch(CRED);
    expect((await stack.repo.findById(id, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
    expect(mock.acquired.get(record)).toBe(1); // acquisita UNA sola volta: nessun doppione
  });

  it("la Ricevuta del giorno CORRENTE è rifiutata (solo giorni passati)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    await addPending(stack, recItalianoOk());
    await stack.outbox.processCredentialBatch(CRED); // acquisita oggi

    // Chiedere la ricevuta di OGGI → il server rifiuta (esito false) → ReceiptError, non auth.
    const { utente, token } = await stack.tokens.getToken(CRED);
    await expect(stack.client.ricevuta(utente, token, TODAY)).rejects.toBeInstanceOf(
      AlloggiatiReceiptError,
    );
  });

  it("riconciliazione senza UNVERIFIED → no-op (non scarica nemmeno la ricevuta)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });

    const result = await stack.reconcile.reconcileCredential(CRED, "2026-05-29");

    expect(result.total).toBe(0);
    expect(result.confirmed).toBe(0);
    expect(result.requeued).toBe(0);
    expect(result.review).toBe(0);
    expect(result.rows).toEqual([]);
    expect(mock.callCount("Ricevuta")).toBe(0);
  });
});

describe("Mock Alloggiati — Flusso completo: genera → verifica → invia → conferma", () => {
  it("verifica (Test) NON ha effetti; poi Send applica gli esiti per-riga", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });

    // genera: una valida + una fuori finestra
    const ok = await addPending(stack, recItalianoOk(), { numeroDocumento: "E2E-OK" });
    const ko = await addPending(stack, recItalianoOk(FUORI_FINESTRA), {
      numeroDocumento: "E2E-KO",
      dataArrivo: FUORI_FINESTRA,
    });

    // verifica (Test): dry-run, nessun cambio di stato, nessuna acquisizione
    const report = await stack.verify.verifyCredentialBatch(CRED);
    expect(report.total).toBe(2);
    expect(report.valid).toBe(1);
    expect(mock.callCount("Test")).toBe(1);
    expect(mock.acquired.size).toBe(0); // Test non acquisisce
    expect((await stack.repo.findById(ok, ORG))?.status).toBe(SchedinaStatus.PENDING);

    // invia (Send) + conferma
    await stack.outbox.processCredentialBatch(CRED);
    expect((await stack.repo.findById(ok, ORG))?.status).toBe(SchedinaStatus.ACQUIRED);
    expect((await stack.repo.findById(ko, ORG))?.status).toBe(SchedinaStatus.REJECTED);
  });

  it("il token viene generato una sola volta e riusato (cache del TokenManager)", async () => {
    const mock = new AlloggiatiMockServer(SECRET, { today: TODAY });
    const stack = createAlloggiatiStack({ mock, secret: SECRET });
    await addPending(stack, recItalianoOk(), { numeroDocumento: "TOK-1" });

    await stack.verify.verifyCredentialBatch(CRED); // 1° uso del token
    await stack.outbox.processCredentialBatch(CRED); // riusa lo stesso token

    expect(mock.callCount("GenerateToken")).toBe(1);
  });
});
