import { describe, expect, it } from "vitest";
import { comuneProvinciaMatchesCredential, normalizeProvincia } from "../domain/validation";

describe("normalizeProvincia", () => {
  it("trim + uppercase", () => {
    expect(normalizeProvincia(" rm ")).toBe("RM");
  });
});

describe("comuneProvinciaMatchesCredential", () => {
  it("vero quando le province coincidono (case-insensitive)", () => {
    expect(comuneProvinciaMatchesCredential("RM", "rm")).toBe(true);
  });

  it("falso quando le province differiscono", () => {
    expect(comuneProvinciaMatchesCredential("MI", "RM")).toBe(false);
  });
});
