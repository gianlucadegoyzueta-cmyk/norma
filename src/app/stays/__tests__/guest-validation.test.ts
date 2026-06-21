import { describe, expect, it } from "vitest";
import { type PersonInput, validatePerson } from "../guest-validation";

const valid: PersonInput = {
  firstName: "Mario",
  lastName: "Rossi",
  sex: "M",
  birthDate: "1990-01-15",
  birthCountryId: "c1",
  citizenshipId: "c1",
  documentTypeId: "d1",
  documentNumber: "AB123",
  documentPlaceId: "p1",
};

describe("validatePerson", () => {
  it("raccoglie TUTTI gli errori dei campi obbligatori (niente stop al primo)", () => {
    const { data, errors } = validatePerson({}, true);
    expect(data).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(
      [
        "birthCountryId",
        "birthDate",
        "citizenshipId",
        "firstName",
        "lastName",
        "sex",
        "documentTypeId",
        "documentNumber",
        "documentPlaceId",
      ].sort(),
    );
  });

  it("input valido → data popolata e nessun errore", () => {
    const { data, errors } = validatePerson(valid, true);
    expect(errors).toEqual({});
    expect(data?.firstName).toBe("Mario");
    expect(data?.lastName).toBe("Rossi");
    expect(data?.sex).toBe("M");
    expect(data?.birthDate.toISOString()).toContain("1990-01-15");
  });

  it("data di nascita non valida → errore SOLO su birthDate", () => {
    const { data, errors } = validatePerson({ ...valid, birthDate: "non-una-data" }, true);
    expect(data).toBeNull();
    expect(Object.keys(errors)).toEqual(["birthDate"]);
  });

  it("sesso non valido → errore su sex", () => {
    const { errors } = validatePerson({ ...valid, sex: "X" }, true);
    expect(errors).toHaveProperty("sex");
  });

  it("senza documento i campi documento restano null", () => {
    const { data } = validatePerson({ ...valid, documentNumber: "AB123" }, false);
    expect(data?.documentNumber).toBeNull();
    expect(data?.documentTypeId).toBeNull();
  });

  it("con documento completo i campi passano", () => {
    const { data } = validatePerson(
      { ...valid, documentTypeId: "d1", documentNumber: "AB123", documentPlaceId: "p1" },
      true,
    );
    expect(data?.documentTypeId).toBe("d1");
    expect(data?.documentNumber).toBe("AB123");
    expect(data?.documentPlaceId).toBe("p1");
  });

  it("withDocument=true ma documento mancante → errori sui campi documento", () => {
    const senzaDoc: PersonInput = {
      firstName: "Mario",
      lastName: "Rossi",
      sex: "M",
      birthDate: "1990-01-15",
      birthCountryId: "c1",
      citizenshipId: "c1",
    };
    const { data, errors } = validatePerson(senzaDoc, true);
    expect(data).toBeNull();
    expect(errors).toHaveProperty("documentTypeId");
    expect(errors).toHaveProperty("documentNumber");
    expect(errors).toHaveProperty("documentPlaceId");
  });
});
