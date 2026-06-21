import { describe, expect, it } from "vitest";
import {
  ESTERO_DESCRIZIONE,
  PROVINCIA_DESCRIZIONE,
  normalizzaNome,
  provenienzaEstero,
  provenienzaItalia,
} from "../provenienze";

describe("provenienze Umbria (Turismatica)", () => {
  it("copertura: tutte le province italiane + voci estere", () => {
    // 107 province + 4 vecchie province sarde (CI/VS/OG/OT) presenti
    expect(Object.keys(PROVINCIA_DESCRIZIONE).length).toBeGreaterThanOrEqual(107);
    for (const sigla of ["CI", "VS", "OG", "OT", "BT", "FM", "MB"]) {
      expect(PROVINCIA_DESCRIZIONE[sigla]).toBeDefined();
    }
    expect(Object.keys(ESTERO_DESCRIZIONE).length).toBeGreaterThan(40);
  });

  it("provenienzaItalia per sigla (case-insensitive); sconosciuta → null", () => {
    expect(provenienzaItalia("PG")).toEqual({ code: "PG", descrizione: "PERUGIA" });
    expect(provenienzaItalia("rm")).toEqual({ code: "RM", descrizione: "ROMA" });
    expect(provenienzaItalia("XX")).toBeNull();
  });

  it("provenienzaEstero per nome ufficiale", () => {
    expect(provenienzaEstero("GERMANIA")).toEqual({ code: "D", descrizione: "GERMANIA" });
    expect(provenienzaEstero("Brasile")).toEqual({ code: "515", descrizione: "BRASILE" });
    expect(provenienzaEstero("Atlantide")).toBeNull();
  });

  it("alias AlloggiatiWeb ↔ Turismatica", () => {
    expect(provenienzaEstero("Regno Unito")?.code).toBe("GB");
    expect(provenienzaEstero("Stati Uniti d'America")?.code).toBe("USA");
    expect(provenienzaEstero("Olanda")?.code).toBe("NL");
    expect(provenienzaEstero("Federazione Russa")?.code).toBe("975");
  });

  it("normalizzaNome rimuove accenti, apostrofi, doppi spazi", () => {
    expect(normalizzaNome("  Côte d'Ivoire ")).toBe("COTE D IVOIRE");
  });
});
