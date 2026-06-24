import { describe, expect, it } from "vitest";
import { extractMrzLines, mrzBirthToIso, parseMrz } from "../document-scan";

// Fixture MRZ FITTIZIE dello standard ICAO 9303 (paese "UTO", "ANNA MARIA ERIKSSON"): non sono
// dati di una persona reale (guardrail #3 — fixture sempre anonime).
const TD3 = [
  "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<",
  "L898902C36UTO7408122F1204159ZE184226B<<<<<10",
];
const TD1 = [
  "I<UTOD231458907<<<<<<<<<<<<<<<",
  "7408122F1204159UTO<<<<<<<<<<<6",
  "ERIKSSON<<ANNA<MARIA<<<<<<<<<<",
];

describe("parseMrz", () => {
  it("TD3 (passaporto): estrae nome, n° documento, nascita, sesso", () => {
    expect(parseMrz(TD3, 2026)).toEqual({
      lastName: "ERIKSSON",
      firstName: "ANNA MARIA",
      documentNumber: "L898902C3",
      birthDate: "1974-08-12",
      sex: "F",
    });
  });

  it("TD1 (carta d'identità): estrae i campi dalle 3 righe", () => {
    expect(parseMrz(TD1, 2026)).toEqual({
      lastName: "ERIKSSON",
      firstName: "ANNA MARIA",
      documentNumber: "D23145890",
      birthDate: "1974-08-12",
      sex: "F",
    });
  });

  it("righe non MRZ → null", () => {
    expect(parseMrz(["CIAO", "MONDO"], 2026)).toBeNull();
  });
});

describe("mrzBirthToIso", () => {
  it("pivot del secolo: oltre l'anno corrente a due cifre → 1900+", () => {
    expect(mrzBirthToIso("850101", 2026)).toBe("1985-01-01");
  });
  it("entro l'anno corrente a due cifre → 2000+", () => {
    expect(mrzBirthToIso("050101", 2026)).toBe("2005-01-01");
  });
  it("input non valido → undefined", () => {
    expect(mrzBirthToIso("7408", 2026)).toBeUndefined();
    expect(mrzBirthToIso("741301", 2026)).toBeUndefined(); // mese 13
  });
});

describe("extractMrzLines", () => {
  it("isola il blocco TD3 (2×44) dal rumore OCR", () => {
    const ocr = `Rilasciato da\n${TD3[0]}\n${TD3[1]}\nfooter`;
    expect(extractMrzLines(ocr)).toEqual(TD3);
  });

  it("isola il blocco TD1 (3×30)", () => {
    const ocr = `${TD1[0]}\n${TD1[1]}\n${TD1[2]}`;
    expect(extractMrzLines(ocr)).toEqual(TD1);
  });

  it("nessuna riga MRZ → null", () => {
    expect(extractMrzLines("solo testo\nnormale")).toBeNull();
  });
});
