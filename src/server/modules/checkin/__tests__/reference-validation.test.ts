import { describe, expect, it } from "vitest";
import type { GuestData } from "@/server/modules/stays";
import { type ExistingReferenceIds, validateReferenceIds } from "../reference-validation";

// Insiemi "tutto esiste" di base: i test sovrascrivono solo ciò che serve.
const existing: ExistingReferenceIds = {
  countries: new Set(["IT", "FR", "US"]),
  comuni: new Set(["roma", "milano"]),
  documentTypes: new Set(["passaporto", "ci"]),
};

/** GuestData minimo valido (tutti gli ID esistono); i test mutano i singoli campi. */
function baseGuest(overrides: Partial<GuestData> = {}): GuestData {
  return {
    firstName: "Mario",
    lastName: "Rossi",
    sex: "M",
    birthDate: new Date("1990-01-01T12:00:00.000Z"),
    birthCountryId: "IT",
    citizenshipId: "IT",
    birthComuneId: "roma",
    residenceCountryId: null,
    residenceComuneId: null,
    residenceForeignLocality: null,
    tourismType: null,
    transportMeans: null,
    documentTypeId: "passaporto",
    documentNumber: "AA123",
    documentPlaceId: "roma",
    ...overrides,
  };
}

describe("validateReferenceIds", () => {
  it("nessun errore quando tutti gli ID di riferimento esistono", () => {
    expect(validateReferenceIds(baseGuest(), existing)).toEqual({});
  });

  it("ID di stato di nascita inventato → errore per-campo birthCountryUnknown", () => {
    const errs = validateReferenceIds(baseGuest({ birthCountryId: "ZZ-inventato" }), existing);
    expect(errs).toEqual({ birthCountryId: "birthCountryUnknown" });
  });

  it("cittadinanza inventata → citizenshipUnknown", () => {
    const errs = validateReferenceIds(baseGuest({ citizenshipId: "nope" }), existing);
    expect(errs.citizenshipId).toBe("citizenshipUnknown");
  });

  it("tipo documento inventato → documentTypeUnknown", () => {
    const errs = validateReferenceIds(baseGuest({ documentTypeId: "fake" }), existing);
    expect(errs.documentTypeId).toBe("documentTypeUnknown");
  });

  it("comune di nascita inventato → birthComuneUnknown", () => {
    const errs = validateReferenceIds(baseGuest({ birthComuneId: "atlantide" }), existing);
    expect(errs.birthComuneId).toBe("birthComuneUnknown");
  });

  it("luogo di rilascio valido come Comune (no errore)", () => {
    expect(validateReferenceIds(baseGuest({ documentPlaceId: "milano" }), existing)).toEqual({});
  });

  it("luogo di rilascio valido come Country estero (no errore)", () => {
    expect(validateReferenceIds(baseGuest({ documentPlaceId: "FR" }), existing)).toEqual({});
  });

  it("luogo di rilascio inventato (né Comune né Country) → documentPlaceUnknown", () => {
    const errs = validateReferenceIds(baseGuest({ documentPlaceId: "narnia" }), existing);
    expect(errs.documentPlaceId).toBe("documentPlaceUnknown");
  });

  it("campi facoltativi null non producono errori", () => {
    const errs = validateReferenceIds(
      baseGuest({ residenceCountryId: null, residenceComuneId: null, birthComuneId: null }),
      existing,
    );
    expect(errs).toEqual({});
  });

  it("residenza con ID inventati → errori per-campo solo se valorizzati", () => {
    const errs = validateReferenceIds(
      baseGuest({ residenceCountryId: "boh", residenceComuneId: "boh2" }),
      existing,
    );
    expect(errs).toEqual({
      residenceCountryId: "residenceCountryUnknown",
      residenceComuneId: "residenceComuneUnknown",
    });
  });

  it("raccoglie PIÙ errori in un solo passaggio (non si ferma al primo)", () => {
    const errs = validateReferenceIds(
      baseGuest({ birthCountryId: "x", citizenshipId: "y", documentTypeId: "z" }),
      existing,
    );
    expect(errs).toEqual({
      birthCountryId: "birthCountryUnknown",
      citizenshipId: "citizenshipUnknown",
      documentTypeId: "documentTypeUnknown",
    });
  });
});
