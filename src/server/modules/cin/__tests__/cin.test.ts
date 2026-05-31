import { describe, expect, it } from "vitest";
import {
  cinForDeclarationExport,
  CIN_MAX_LENGTH,
  CIN_MIN_LENGTH,
  isCinCompliant,
  normalizeCin,
  propertyNeedsCin,
  validateCinFormat,
} from "../domain/cin";

describe("normalizeCin", () => {
  it("rimuove spazi e porta in maiuscolo", () => {
    expect(normalizeCin("  it039007b1xxxxx ")).toBe("IT039007B1XXXXX");
    expect(normalizeCin("IT 039 007 B1 XXXXX")).toBe("IT039007B1XXXXX");
  });
});

describe("validateCinFormat — strutturale e prudente", () => {
  it("accetta l'esempio ufficiale IT039007B1XXXXX", () => {
    const r = validateCinFormat("IT039007B1XXXXX");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.normalized).toBe("IT039007B1XXXXX");
  });

  it("normalizza prima di validare (spazi + minuscolo)", () => {
    const r = validateCinFormat(" it 039007 b1 xxxxx ");
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.normalized).toBe("IT039007B1XXXXX");
  });

  it("rifiuta CIN vuoto", () => {
    const r = validateCinFormat("   ");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toContain("vuoto");
  });

  it("rifiuta senza prefisso IT", () => {
    const r = validateCinFormat("XX039007B1XXXXX");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toContain("IT");
  });

  it("rifiuta caratteri non alfanumerici dopo IT", () => {
    const r = validateCinFormat("IT039-007-B1XX");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toContain("lettere e numeri");
  });

  it("rifiuta lunghezze fuori range (troppo corto / troppo lungo)", () => {
    expect(validateCinFormat("IT12345").valid).toBe(false); // 7
    expect(validateCinFormat("IT" + "A".repeat(CIN_MAX_LENGTH)).valid).toBe(false);
  });

  it("è TOLLERANTE entro il range: accetta forme di lunghezza diversa (no pattern rigido)", () => {
    // 12 e 17 caratteri totali: entrambi accettati (il check esatto è demandato al TODO ufficiale).
    expect(validateCinFormat("IT" + "A".repeat(CIN_MIN_LENGTH - 2)).valid).toBe(true);
    expect(validateCinFormat("IT" + "A".repeat(CIN_MAX_LENGTH - 2)).valid).toBe(true);
  });
});

describe("compliance helpers", () => {
  it("isCinCompliant: solo OBTAINED è in regola", () => {
    expect(isCinCompliant("OBTAINED")).toBe(true);
    expect(isCinCompliant("PENDING")).toBe(false);
    expect(isCinCompliant("NOT_REQUIRED")).toBe(false);
  });

  it("propertyNeedsCin: PENDING sì, OBTAINED/NOT_REQUIRED no", () => {
    expect(propertyNeedsCin("PENDING")).toBe(true);
    expect(propertyNeedsCin("OBTAINED")).toBe(false);
    expect(propertyNeedsCin("NOT_REQUIRED")).toBe(false);
  });
});

describe("cinForDeclarationExport (predisposto)", () => {
  it("ritorna il CIN solo se OTTENUTO e presente", () => {
    expect(cinForDeclarationExport({ cin: "IT039007B1XXXXX", cinStatus: "OBTAINED" })).toBe(
      "IT039007B1XXXXX",
    );
    expect(cinForDeclarationExport({ cin: "IT039007B1XXXXX", cinStatus: "PENDING" })).toBeNull();
    expect(cinForDeclarationExport({ cin: null, cinStatus: "OBTAINED" })).toBeNull();
  });
});
