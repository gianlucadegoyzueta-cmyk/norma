import { describe, expect, it } from "vitest";
import { MOBILE_SECTIONS, NAV_GROUPS, NAV_SECTIONS, matchActive } from "../nav";

// `@/lib/nav` è la sorgente UNICA delle sezioni: sidebar, command palette e bottom-bar mobile
// leggono tutte da qui. Questi invarianti proteggono da disallineamenti silenziosi.
describe("nav config", () => {
  it("ogni sezione ha key, href assoluto e label, senza href né key duplicati", () => {
    const hrefs = NAV_SECTIONS.map((s) => s.href);
    const keys = NAV_SECTIONS.map((s) => s.key);
    for (const s of NAV_SECTIONS) {
      expect(s.href.startsWith("/")).toBe(true);
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.key.length).toBeGreaterThan(0);
    }
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("l'elenco piatto è esattamente l'unione (in ordine) dei gruppi della sidebar", () => {
    const fromGroups = NAV_GROUPS.flatMap((g) => g.items);
    expect(NAV_SECTIONS).toEqual(fromGroups);
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

  it("matchActive sceglie il prefisso più lungo (es. /stays/123 → Soggiorni)", () => {
    expect(matchActive("/stays")?.key).toBe("stays");
    expect(matchActive("/stays/abc")?.key).toBe("stays");
    expect(matchActive("/sconosciuto")).toBeUndefined();
  });
});
