import { describe, expect, it } from "vitest";
import { resolveProvenance } from "../provenance";

const cit = (code: string, name: string) => ({ code, name });

describe("resolveProvenance", () => {
  it("comune di residenza presente → ITALIA con la sua provincia (non approssimata)", () => {
    const r = resolveProvenance({
      residenceComune: { provincia: "RM" },
      residenceCountry: null,
      citizenship: cit("FR", "Francia"),
    });
    expect(r).toEqual({ provenance: { kind: "ITALIA", provincia: "RM" }, approximated: false });
  });

  it("solo Stato di residenza → ESTERO con quello Stato (non approssimata)", () => {
    const r = resolveProvenance({
      residenceComune: null,
      residenceCountry: cit("DE", "Germania"),
      citizenship: cit("IT", "Italia"),
    });
    expect(r.provenance).toEqual({ kind: "ESTERO", countryCode: "DE", countryName: "Germania" });
    expect(r.approximated).toBe(false);
  });

  it("nessuna residenza → fallback sulla cittadinanza, marcato approssimato", () => {
    const r = resolveProvenance({
      residenceComune: null,
      residenceCountry: null,
      citizenship: cit("ES", "Spagna"),
    });
    expect(r.provenance).toEqual({ kind: "ESTERO", countryCode: "ES", countryName: "Spagna" });
    expect(r.approximated).toBe(true);
  });

  it("il comune di residenza ha priorità sullo Stato di residenza", () => {
    const r = resolveProvenance({
      residenceComune: { provincia: "MI" },
      residenceCountry: cit("DE", "Germania"),
      citizenship: cit("DE", "Germania"),
    });
    expect(r.provenance).toEqual({ kind: "ITALIA", provincia: "MI" });
  });
});
