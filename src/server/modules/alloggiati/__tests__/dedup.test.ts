import { describe, expect, it } from "vitest";
import { computeDedupKey } from "../domain/dedup";
import type { DedupKeyInput } from "../domain/types";

const base: DedupKeyInput = {
  struttura: "cred_1",
  idAppartamento: null,
  dataArrivo: "2026-06-01",
  numeroDocumento: "AB1234567",
  cognome: "Rossi",
  nome: "Mario",
  dataNascita: "1990-05-20",
};

describe("computeDedupKey", () => {
  it("è deterministica: stessi dati → stessa chiave", () => {
    expect(computeDedupKey(base)).toBe(computeDedupKey({ ...base }));
  });

  it("è un hash sha256 (64 caratteri esadecimali)", () => {
    expect(computeDedupKey(base)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("è robusta a maiuscole/minuscole e spazi irrilevanti", () => {
    const noisy: DedupKeyInput = {
      ...base,
      cognome: "  rossi ",
      nome: "MARIO",
      numeroDocumento: " ab1234567 ",
    };
    expect(computeDedupKey(noisy)).toBe(computeDedupKey(base));
  });

  it("cambia se cambia un dato identificativo", () => {
    expect(computeDedupKey({ ...base, numeroDocumento: "ZZ9999999" })).not.toBe(
      computeDedupKey(base),
    );
    expect(computeDedupKey({ ...base, dataArrivo: "2026-06-02" })).not.toBe(computeDedupKey(base));
    expect(computeDedupKey({ ...base, dataNascita: "1991-05-20" })).not.toBe(computeDedupKey(base));
  });

  it("distingue lo stesso ospite in appartamenti diversi (gestione appartamenti)", () => {
    const app5 = computeDedupKey({ ...base, idAppartamento: "5" });
    const app9 = computeDedupKey({ ...base, idAppartamento: "9" });
    expect(app5).not.toBe(app9);
    expect(app5).not.toBe(computeDedupKey(base)); // null ≠ "5"
  });

  it("gestisce gli ospiti senza documento (familiari/membri): dedup su nome+nascita", () => {
    const a: DedupKeyInput = { ...base, numeroDocumento: "" };
    const b: DedupKeyInput = { ...base, numeroDocumento: "" };
    expect(computeDedupKey(a)).toBe(computeDedupKey(b));
  });
});
