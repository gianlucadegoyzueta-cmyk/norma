import { describe, expect, it } from "vitest";
import { createReferenceTables } from "../../alloggiati";
import {
  GenerationError,
  type GenerationGuest,
  buildSchedinaIntents,
  computeSchedinaDeadline,
  computeSendWindow,
  isArrivalWithinSendWindow,
} from "../domain/generation";
import { tipiPerParty } from "../domain/parties";

describe("computeSchedinaDeadline", () => {
  const arrivo = new Date("2026-06-01T15:00:00.000Z");
  it("soggiorno normale → +24h", () => {
    expect(computeSchedinaDeadline(arrivo, false).toISOString()).toBe("2026-06-02T15:00:00.000Z");
  });
  it("soggiorno breve (≤24h) → +6h", () => {
    expect(computeSchedinaDeadline(arrivo, true).toISOString()).toBe("2026-06-01T21:00:00.000Z");
  });
});

describe("finestra di invio (data di arrivo: oggi o ieri)", () => {
  // "ora" fissa a mezzogiorno UTC → la data Roma coincide con quella UTC (niente ambiguità).
  const now = new Date("2026-05-28T12:00:00Z");
  const at = (iso: string) => new Date(`${iso}T10:00:00Z`);

  it("computeSendWindow → [ieri, oggi] in fuso italiano", () => {
    expect(computeSendWindow(now)).toEqual({ earliest: "2026-05-27", latest: "2026-05-28" });
  });

  it("arrivo OGGI → ammesso", () => {
    expect(isArrivalWithinSendWindow(at("2026-05-28"), now)).toBe(true);
  });
  it("arrivo IERI → ammesso", () => {
    expect(isArrivalWithinSendWindow(at("2026-05-27"), now)).toBe(true);
  });
  it("arrivo 2 giorni fa → rifiutato", () => {
    expect(isArrivalWithinSendWindow(at("2026-05-26"), now)).toBe(false);
  });
  it("arrivo DOMANI → rifiutato", () => {
    expect(isArrivalWithinSendWindow(at("2026-05-29"), now)).toBe(false);
  });
});

describe("tipiPerParty", () => {
  it("deriva i codici tipo-alloggiato dalla comitiva", () => {
    expect(tipiPerParty("SINGOLO")).toEqual({ capo: "OSPITE_SINGOLO", membro: null });
    expect(tipiPerParty("FAMIGLIA")).toEqual({ capo: "CAPO_FAMIGLIA", membro: "FAMILIARE" });
    expect(tipiPerParty("GRUPPO")).toEqual({ capo: "CAPO_GRUPPO", membro: "MEMBRO_GRUPPO" });
  });
});

const refs = createReferenceTables({
  comuni: [{ id: "com_roma", code: "058091001", provincia: "RM" }],
  countries: [{ id: "ctry_italia", code: "100000100" }],
  documentTypes: [{ id: "doc_idele", code: "IDELE" }],
});

function guest(id: string, over: Partial<GenerationGuest> = {}): GenerationGuest {
  return {
    id,
    firstName: "Mario",
    lastName: "Rossi",
    sex: "M",
    birthDate: new Date("1990-05-20T00:00:00.000Z"),
    birthCountryId: "ctry_italia",
    birthComuneId: "com_roma",
    citizenshipId: "ctry_italia",
    documentTypeId: "doc_idele",
    documentNumber: "AB1234567",
    documentPlaceId: "com_roma",
    tipoAlloggiato: "OSPITE_SINGOLO",
    ...over,
  };
}

const stay = {
  arrivalDate: new Date("2026-06-01T15:00:00.000Z"),
  departureDate: new Date("2026-06-04T10:00:00.000Z"),
  isShortStay: false,
};

describe("buildSchedinaIntents", () => {
  it("un intento per ospite, con deadline e dedup corretti", () => {
    const intents = buildSchedinaIntents(
      {
        organizationId: "org_1",
        credentialId: "cred_1",
        alloggiatiApartmentId: null,
        stay,
        guests: [guest("g1")],
      },
      refs,
    );
    expect(intents).toHaveLength(1);
    expect(intents[0].guestId).toBe("g1");
    expect(intents[0].credentialId).toBe("cred_1");
    expect(intents[0].deadlineAt.toISOString()).toBe("2026-06-02T15:00:00.000Z"); // +24h
    expect(intents[0].dedup).toMatchObject({
      struttura: "cred_1",
      idAppartamento: null,
      dataArrivo: "2026-06-01",
      numeroDocumento: "AB1234567",
      cognome: "Rossi",
      nome: "Mario",
      dataNascita: "1990-05-20",
    });
  });

  it("soggiorno breve → deadline a +6h", () => {
    const intents = buildSchedinaIntents(
      {
        organizationId: "org_1",
        credentialId: "cred_1",
        alloggiatiApartmentId: null,
        stay: { ...stay, isShortStay: true },
        guests: [guest("g1")],
      },
      refs,
    );
    expect(intents[0].deadlineAt.toISOString()).toBe("2026-06-01T21:00:00.000Z");
  });

  it("gestione appartamenti: idAppartamento finisce nella dedup", () => {
    const intents = buildSchedinaIntents(
      {
        organizationId: "org_1",
        credentialId: "cred_1",
        alloggiatiApartmentId: "000004",
        stay,
        guests: [guest("g1")],
      },
      refs,
    );
    expect(intents[0].dedup.idAppartamento).toBe("000004");
  });

  it("membro famiglia senza documento: numeroDocumento vuoto nella dedup", () => {
    const fam = guest("g2", {
      tipoAlloggiato: "FAMILIARE",
      documentTypeId: null,
      documentNumber: null,
      documentPlaceId: null,
    });
    const intents = buildSchedinaIntents(
      {
        organizationId: "org_1",
        credentialId: "cred_1",
        alloggiatiApartmentId: null,
        stay,
        guests: [fam],
      },
      refs,
    );
    expect(intents[0].dedup.numeroDocumento).toBe("");
  });

  it("ospite con dati mancanti (16/17/18 senza documento) → errore, nessun intento", () => {
    const bad = guest("g3", { documentNumber: null });
    expect(() =>
      buildSchedinaIntents(
        {
          organizationId: "org_1",
          credentialId: "cred_1",
          alloggiatiApartmentId: null,
          stay,
          guests: [guest("g1"), bad],
        },
        refs,
      ),
    ).toThrow();
  });

  it("nessun ospite → GenerationError", () => {
    expect(() =>
      buildSchedinaIntents(
        {
          organizationId: "org_1",
          credentialId: "cred_1",
          alloggiatiApartmentId: null,
          stay,
          guests: [],
        },
        refs,
      ),
    ).toThrow(GenerationError);
  });
});
