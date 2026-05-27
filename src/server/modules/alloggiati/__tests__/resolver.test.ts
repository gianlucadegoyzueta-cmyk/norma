import { describe, expect, it } from "vitest";
import { FIELD_LAYOUT, TRACCIATO_FILE_UNICO_LEN, TRACCIATO_LEN } from "../domain/tracciato";
import {
  type ResolverGuest,
  type ResolverStay,
  ResolverError,
  buildRecordFromEntities,
  createReferenceTables,
  resolveTracciatoInput,
} from "../domain/resolver";

// Tabelle di riferimento di ESEMPIO (niente DB): id interni → codici ufficiali (larghezza esatta).
const refs = createReferenceTables({
  comuni: [
    { id: "com_roma", code: "058091001", provincia: "RM" },
    { id: "com_milano", code: "015146001", provincia: "MI" },
  ],
  countries: [
    { id: "ctry_italia", code: "100000100" },
    { id: "ctry_francia", code: "200000200" },
  ],
  documentTypes: [
    { id: "doc_idele", code: "IDELE" },
    { id: "doc_pasor", code: "PASOR" },
  ],
});

// Ospite singolo italiano con carta d'identità rilasciata dal comune.
const guestIT: ResolverGuest = {
  firstName: "Mario",
  lastName: "Rossi",
  sex: "M",
  birthDate: new Date("1990-05-20T00:00:00.000Z"),
  birthCountryId: "ctry_italia",
  birthComuneId: "com_roma",
  citizenshipId: "ctry_italia",
  documentTypeId: "doc_idele",
  documentNumber: "AB1234567",
  documentPlaceId: "com_roma", // rilasciato dal Comune
  tipoAlloggiato: "OSPITE_SINGOLO",
};

const stay: ResolverStay = {
  arrivalDate: new Date("2026-06-01T15:00:00.000Z"),
  departureDate: new Date("2026-06-04T10:00:00.000Z"), // 3 giorni
};

describe("resolveTracciatoInput — ospite italiano", () => {
  it("risolve codici, date e giorni correttamente", () => {
    const input = resolveTracciatoInput(guestIT, stay, refs);
    expect(input).toEqual({
      tipoAlloggiato: "OSPITE_SINGOLO",
      dataArrivo: "2026-06-01",
      giorniPermanenza: 3,
      cognome: "Rossi",
      nome: "Mario",
      sesso: "M",
      dataNascita: "1990-05-20",
      statoNascitaCode: "100000100",
      cittadinanzaCode: "100000100",
      comuneNascitaCode: "058091001",
      provinciaNascita: "RM",
      tipoDocumentoCode: "IDELE",
      numeroDocumento: "AB1234567",
      luogoRilascioCode: "058091001",
    });
  });

  it("end-to-end: produce una riga valida di 168 caratteri", () => {
    const rec = buildRecordFromEntities(guestIT, stay, refs);
    expect(rec).toHaveLength(TRACCIATO_LEN);
    const f = (n: keyof typeof FIELD_LAYOUT) => rec.slice(FIELD_LAYOUT[n].start, FIELD_LAYOUT[n].start + FIELD_LAYOUT[n].len);
    expect(f("tipoAlloggiato")).toBe("16");
    expect(f("provinciaNascita")).toBe("RM");
    expect(f("comuneNascita")).toBe("058091001");
    expect(f("tipoDocumento")).toBe("IDELE");
  });

  it("file unico: con idAppartamento la riga è 174", () => {
    const rec = buildRecordFromEntities(guestIT, stay, refs, { idAppartamento: 4 });
    expect(rec).toHaveLength(TRACCIATO_FILE_UNICO_LEN);
    expect(rec.slice(FIELD_LAYOUT.idAppartamento.start)).toBe("000004");
  });
});

describe("resolveTracciatoInput — ospite straniero", () => {
  const guestFR: ResolverGuest = {
    ...guestIT,
    birthCountryId: "ctry_francia",
    birthComuneId: null, // nato all'estero
    citizenshipId: "ctry_francia",
    documentTypeId: "doc_pasor",
    documentNumber: "FR99887766",
    documentPlaceId: "ctry_francia", // passaporto rilasciato dallo Stato
  };

  it("niente comune/provincia; stato e luogo risolti come Stato", () => {
    const input = resolveTracciatoInput(guestFR, stay, refs);
    expect(input.comuneNascitaCode).toBeUndefined();
    expect(input.provinciaNascita).toBeUndefined();
    expect(input.statoNascitaCode).toBe("200000200");
    expect(input.cittadinanzaCode).toBe("200000200");
    expect(input.luogoRilascioCode).toBe("200000200"); // risolto via Stato, non Comune
  });

  it("end-to-end: comune e provincia in bianco nella riga", () => {
    const rec = buildRecordFromEntities(guestFR, stay, refs);
    expect(rec.slice(FIELD_LAYOUT.comuneNascita.start, FIELD_LAYOUT.comuneNascita.start + 9)).toBe(" ".repeat(9));
    expect(rec.slice(FIELD_LAYOUT.provinciaNascita.start, FIELD_LAYOUT.provinciaNascita.start + 2)).toBe("  ");
  });
});

describe("resolveTracciatoInput — familiare/membro gruppo (19/20)", () => {
  it("non richiede documento: i campi documento restano indefiniti", () => {
    const fam: ResolverGuest = {
      ...guestIT,
      tipoAlloggiato: "FAMILIARE",
      documentTypeId: null,
      documentNumber: null,
      documentPlaceId: null,
    };
    const input = resolveTracciatoInput(fam, stay, refs);
    expect(input.tipoDocumentoCode).toBeUndefined();
    expect(input.numeroDocumento).toBeUndefined();
    expect(input.luogoRilascioCode).toBeUndefined();
    // la riga ha comunque i campi documento in bianco
    const rec = buildRecordFromEntities(fam, stay, refs);
    expect(rec.slice(FIELD_LAYOUT.tipoDocumento.start, FIELD_LAYOUT.tipoDocumento.start + 5)).toBe("     ");
  });
});

describe("resolveTracciatoInput — giorni di permanenza", () => {
  it("soggiorno in giornata (stessa data) → 1 giorno", () => {
    const input = resolveTracciatoInput(guestIT, {
      arrivalDate: new Date("2026-06-01T09:00:00.000Z"),
      departureDate: new Date("2026-06-01T20:00:00.000Z"),
    }, refs);
    expect(input.giorniPermanenza).toBe(1);
  });

  it("partenza mancante → errore chiaro", () => {
    expect(() => resolveTracciatoInput(guestIT, { arrivalDate: stay.arrivalDate, departureDate: null }, refs))
      .toThrow(ResolverError);
  });

  it("partenza prima dell'arrivo → errore", () => {
    expect(() => resolveTracciatoInput(guestIT, {
      arrivalDate: new Date("2026-06-10T00:00:00.000Z"),
      departureDate: new Date("2026-06-08T00:00:00.000Z"),
    }, refs)).toThrow(ResolverError);
  });
});

describe("resolveTracciatoInput — errori su dati mancanti/non trovati", () => {
  it("stato di nascita non in tabella → errore", () => {
    expect(() => resolveTracciatoInput({ ...guestIT, birthCountryId: "ctry_ignoto" }, stay, refs)).toThrow(ResolverError);
  });

  it("cittadinanza non in tabella → errore", () => {
    expect(() => resolveTracciatoInput({ ...guestIT, citizenshipId: "ctry_ignoto" }, stay, refs)).toThrow(ResolverError);
  });

  it("comune di nascita non in tabella → errore", () => {
    expect(() => resolveTracciatoInput({ ...guestIT, birthComuneId: "com_ignoto" }, stay, refs)).toThrow(ResolverError);
  });

  it("16/17/18 senza numero documento → errore", () => {
    expect(() => resolveTracciatoInput({ ...guestIT, documentNumber: null }, stay, refs)).toThrow(ResolverError);
  });

  it("tipo documento non in tabella → errore", () => {
    expect(() => resolveTracciatoInput({ ...guestIT, documentTypeId: "doc_ignoto" }, stay, refs)).toThrow(ResolverError);
  });

  it("luogo di rilascio non trovato in nessuna tabella → errore", () => {
    expect(() => resolveTracciatoInput({ ...guestIT, documentPlaceId: "xxx_ignoto" }, stay, refs)).toThrow(ResolverError);
  });
});
