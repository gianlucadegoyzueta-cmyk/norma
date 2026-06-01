import { describe, expect, it } from "vitest";
import { selectVersionAt, type VersionedConfig } from "../domain/version-select";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

// Scenario Firenze: vecchia tariffa fino al 2025-01-31, nuova dal 2025-02-01 (aperta).
const FIRENZE_VERSIONS: VersionedConfig<string>[] = [
  { validFrom: d("2023-01-01"), validTo: d("2025-02-01"), value: "OLD_5EUR" },
  { validFrom: d("2025-02-01"), validTo: null, value: "NEW_6EUR" },
];

describe("selectVersionAt — selezione versione regola per data", () => {
  it("data prima del cambio → versione vecchia", () => {
    expect(selectVersionAt(FIRENZE_VERSIONS, d("2025-01-15"))).toBe("OLD_5EUR");
  });

  it("data nel giorno di switch (validFrom inclusivo) → versione nuova", () => {
    expect(selectVersionAt(FIRENZE_VERSIONS, d("2025-02-01"))).toBe("NEW_6EUR");
  });

  it("validTo è esclusivo: l'ultimo giorno della vecchia è 2025-01-31", () => {
    expect(selectVersionAt(FIRENZE_VERSIONS, d("2025-01-31"))).toBe("OLD_5EUR");
  });

  it("data molto futura → versione nuova (validTo null = aperta)", () => {
    expect(selectVersionAt(FIRENZE_VERSIONS, d("2030-06-01"))).toBe("NEW_6EUR");
  });

  it("data prima di qualunque versione → null (regola non disponibile)", () => {
    expect(selectVersionAt(FIRENZE_VERSIONS, d("2020-01-01"))).toBeNull();
  });

  it("nessuna versione → null", () => {
    expect(selectVersionAt([], d("2025-06-01"))).toBeNull();
  });

  it("ordine di input irrilevante: vince comunque la validFrom più recente ≤ data", () => {
    const shuffled = [...FIRENZE_VERSIONS].reverse();
    expect(selectVersionAt(shuffled, d("2026-01-01"))).toBe("NEW_6EUR");
  });

  it("buco di copertura (gap tra due finestre) → null", () => {
    const gapped: VersionedConfig<string>[] = [
      { validFrom: d("2023-01-01"), validTo: d("2024-01-01"), value: "A" },
      { validFrom: d("2025-01-01"), validTo: null, value: "B" },
    ];
    expect(selectVersionAt(gapped, d("2024-06-01"))).toBeNull();
  });
});
