import { describe, expect, it } from "vitest";
import { hashPassword, normalizeEmail, validatePassword, verifyPassword } from "../password";

describe("validatePassword", () => {
  it("rifiuta password troppo corte", () => {
    expect(validatePassword("Ab1")).toMatch(/almeno 8/i);
  });
  it("richiede almeno una lettera", () => {
    expect(validatePassword("12345678")).toMatch(/lettera/i);
  });
  it("richiede almeno un numero", () => {
    expect(validatePassword("abcdefgh")).toMatch(/numero/i);
  });
  it("rifiuta password oltre il limite di bcrypt (72)", () => {
    expect(validatePassword("a1".repeat(40))).toMatch(/troppo lunga/i);
  });
  it("accetta una password valida", () => {
    expect(validatePassword("segreta123")).toBeNull();
  });
});

describe("normalizeEmail", () => {
  it("rimuove spazi e normalizza in minuscolo", () => {
    expect(normalizeEmail("  Mario@Example.IT ")).toBe("mario@example.it");
  });
  it("restituisce null per input non validi", () => {
    expect(normalizeEmail("non-una-email")).toBeNull();
    expect(normalizeEmail("")).toBeNull();
    expect(normalizeEmail("a@b")).toBeNull();
  });
});

describe("hashPassword / verifyPassword", () => {
  it("l'hash non contiene la password in chiaro e verifica correttamente", async () => {
    const hash = await hashPassword("segreta123");
    expect(hash).not.toContain("segreta123");
    expect(await verifyPassword("segreta123", hash)).toBe(true);
    expect(await verifyPassword("sbagliata1", hash)).toBe(false);
  });
  it("è tollerante: hash null o vuoto → false (mai eccezioni)", async () => {
    expect(await verifyPassword("qualsiasi", null)).toBe(false);
    expect(await verifyPassword("qualsiasi", "")).toBe(false);
  });
});
