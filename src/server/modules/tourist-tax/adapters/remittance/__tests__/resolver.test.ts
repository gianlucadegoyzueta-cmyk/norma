import type { TaxRemittanceMode } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { implementedRemittanceModes, resolveRemittanceChannel } from "../resolver";

// A7: il resolver è esaustivo sull'enum Prisma; un mode sconosciuto (config corrotta a runtime)
// non deve restituire undefined silenziosamente ma lanciare.
describe("resolveRemittanceChannel — esaustività", () => {
  it("risolve tutte le modalità conosciute a un canale concreto", () => {
    const modes: TaxRemittanceMode[] = ["MANUAL_EXPORT", "GECOS", "PAGOPA", "COMUNE_PORTAL"];
    for (const m of modes) {
      const channel = resolveRemittanceChannel(m);
      expect(channel).toBeDefined();
      expect(typeof channel.isImplemented).toBe("boolean");
    }
  });

  it("MANUAL_EXPORT è il canale reale (implementato)", () => {
    expect(resolveRemittanceChannel("MANUAL_EXPORT").isImplemented).toBe(true);
  });

  it("una modalità sconosciuta (cast forzato) lancia, non ritorna undefined", () => {
    expect(() => resolveRemittanceChannel("BONIFICO_SEPA" as TaxRemittanceMode)).toThrow();
  });

  it("implementedRemittanceModes include almeno MANUAL_EXPORT", () => {
    expect(implementedRemittanceModes()).toContain("MANUAL_EXPORT");
  });
});
