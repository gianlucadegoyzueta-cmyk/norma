import { describe, expect, it } from "vitest";
import { hasMappedError, mapAlloggiatiError } from "../error-codes";

describe("mapAlloggiatiError", () => {
  it("codice noto → messaggio azionabile per host (non la descrizione grezza)", () => {
    expect(mapAlloggiatiError("12", "Data arrivo errata")).toMatch(/data di arrivo/i);
    expect(hasMappedError("12")).toBe(true);
  });

  it("codice ignoto → ricade sulla descrizione grezza del portale", () => {
    expect(mapAlloggiatiError("999", "Errore X dal portale")).toBe("Errore X dal portale");
    expect(hasMappedError("999")).toBe(false);
  });

  it("nessun codice né descrizione → fallback generico (mai inventato)", () => {
    expect(mapAlloggiatiError(null, null)).toMatch(/respint|senza dettagli/i);
    expect(mapAlloggiatiError(null, "   ")).toMatch(/respint|senza dettagli/i);
  });
});
