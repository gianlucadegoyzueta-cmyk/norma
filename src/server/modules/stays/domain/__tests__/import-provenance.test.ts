import { describe, expect, it } from "vitest";
import { deriveImportProvenance } from "../import-provenance";

describe("deriveImportProvenance", () => {
  it("soggiorno creato a mano: nessuna etichetta, nessun richiamo", () => {
    expect(
      deriveImportProvenance({ importSource: null, importStatus: null, guestsAdded: 0 }),
    ).toEqual({ sourceLabel: null, notice: null });
  });

  it("bozza importata SENZA ospiti: etichetta piattaforma + richiamo 'da completare'", () => {
    expect(
      deriveImportProvenance({ importSource: "AIRBNB", importStatus: "DRAFT", guestsAdded: 0 }),
    ).toEqual({ sourceLabel: "Airbnb", notice: { kind: "draft-empty" } });
  });

  it("bozza importata CON ospiti: etichetta ma nessun richiamo (è in carreggiata)", () => {
    expect(
      deriveImportProvenance({ importSource: "BOOKING", importStatus: "DRAFT", guestsAdded: 2 }),
    ).toEqual({ sourceLabel: "Booking.com", notice: null });
  });

  it("annullata dal feed: richiamo 'cancelled'", () => {
    expect(
      deriveImportProvenance({ importSource: "VRBO", importStatus: "CANCELLED", guestsAdded: 0 }),
    ).toEqual({ sourceLabel: "VRBO", notice: { kind: "cancelled" } });
  });

  it("annullamento da verificare (ospiti già inseriti): richiamo 'needs-cancel-review'", () => {
    expect(
      deriveImportProvenance({
        importSource: "AIRBNB",
        importStatus: "NEEDS_CANCEL_REVIEW",
        guestsAdded: 3,
      }),
    ).toEqual({ sourceLabel: "Airbnb", notice: { kind: "needs-cancel-review" } });
  });

  it("importato ma senza source nota: etichetta di fallback 'iCal'", () => {
    expect(
      deriveImportProvenance({ importSource: null, importStatus: "DRAFT", guestsAdded: 1 }),
    ).toEqual({ sourceLabel: "iCal", notice: null });
  });

  it("source 'OTHER': etichetta generica", () => {
    const r = deriveImportProvenance({
      importSource: "OTHER",
      importStatus: "DRAFT",
      guestsAdded: 1,
    });
    expect(r.sourceLabel).toBe("Altro calendario");
  });
});
