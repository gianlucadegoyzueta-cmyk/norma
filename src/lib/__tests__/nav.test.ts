import { describe, expect, it } from "vitest";
import { MOBILE_SECTIONS, NAV_SECTIONS } from "../nav";

// La bottom-bar mobile referenzia NAV_SECTIONS per indice: questi invarianti proteggono da
// regressioni silenziose se l'elenco viene riordinato o se cambiano gli href.
describe("nav config", () => {
  it("ogni sezione ha href assoluto e label, senza href duplicati", () => {
    const hrefs = NAV_SECTIONS.map((s) => s.href);
    for (const s of NAV_SECTIONS) {
      expect(s.href.startsWith("/")).toBe(true);
      expect(s.label.length).toBeGreaterThan(0);
    }
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("la bottom-bar mobile ha esattamente 4 sezioni, tutte presenti in NAV_SECTIONS", () => {
    expect(MOBILE_SECTIONS).toHaveLength(4);
    for (const s of MOBILE_SECTIONS) {
      expect(NAV_SECTIONS).toContain(s);
    }
  });

  it("copre le sezioni chiave dell'host (soggiorni e schedine sono raggiungibili da mobile)", () => {
    const mobileHrefs = MOBILE_SECTIONS.map((s) => s.href);
    expect(mobileHrefs).toContain("/stays");
    expect(mobileHrefs).toContain("/schedine");
  });
});
