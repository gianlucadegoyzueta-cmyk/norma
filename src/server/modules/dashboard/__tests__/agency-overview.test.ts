import { describe, expect, it } from "vitest";
import {
  attentionScore,
  buildAgencyOverview,
  istatReadinessOf,
  type PropertyComplianceInput,
} from "../agency-overview";

const prop = (partial: Partial<PropertyComplianceInput> = {}): PropertyComplianceInput => ({
  propertyId: "p1",
  propertyName: "Bilocale Trastevere",
  proprietario: "Mario Rossi",
  comuneName: "Roma",
  provincia: "RM",
  hasCredential: true,
  hasCin: true,
  schedineOverdue: 0,
  schedinePending: 0,
  checkinsToday: 0,
  taxAccruedCents: 0,
  ross1000Ready: true,
  ...partial,
});

describe("istatReadinessOf", () => {
  it("è ready solo con Ross1000 configurato", () => {
    expect(istatReadinessOf(prop({ ross1000Ready: true }))).toBe("ready");
    expect(istatReadinessOf(prop({ ross1000Ready: false }))).toBe("incomplete");
  });
});

describe("attentionScore", () => {
  it("pesa lo scaduto più di tutto il resto", () => {
    const overdue = attentionScore(prop({ schedineOverdue: 1 }));
    const everythingElse = attentionScore(
      prop({
        schedinePending: 5,
        checkinsToday: 2,
        hasCredential: false,
        hasCin: false,
        ross1000Ready: false,
      }),
    );
    expect(overdue).toBeGreaterThan(everythingElse);
  });

  it("un immobile a posto ha punteggio zero", () => {
    expect(attentionScore(prop())).toBe(0);
  });
});

describe("buildAgencyOverview", () => {
  it("senza immobili ritorna totali a zero e righe vuote", () => {
    const overview = buildAgencyOverview([]);
    expect(overview.rows).toEqual([]);
    expect(overview.totals).toEqual({
      propertyCount: 0,
      propertiesWithoutCredential: 0,
      propertiesWithoutCin: 0,
      schedineOverdue: 0,
      schedinePending: 0,
      checkinsToday: 0,
      taxAccruedCents: 0,
      istatReadyCount: 0,
      istatIncompleteCount: 0,
      propertiesNeedingAttention: 0,
    });
  });

  it("somma le metriche su tutti gli immobili", () => {
    const overview = buildAgencyOverview([
      prop({ propertyId: "a", schedineOverdue: 2, schedinePending: 1, taxAccruedCents: 1500 }),
      prop({ propertyId: "b", schedineOverdue: 1, checkinsToday: 3, taxAccruedCents: 2500 }),
    ]);
    expect(overview.totals.propertyCount).toBe(2);
    expect(overview.totals.schedineOverdue).toBe(3);
    expect(overview.totals.schedinePending).toBe(1);
    expect(overview.totals.checkinsToday).toBe(3);
    expect(overview.totals.taxAccruedCents).toBe(4000);
  });

  it("conta le lacune di configurazione (credenziale, CIN, Ross1000)", () => {
    const overview = buildAgencyOverview([
      prop({ propertyId: "a", hasCredential: false, hasCin: false, ross1000Ready: false }),
      prop({ propertyId: "b", hasCredential: true, hasCin: true, ross1000Ready: true }),
    ]);
    expect(overview.totals.propertiesWithoutCredential).toBe(1);
    expect(overview.totals.propertiesWithoutCin).toBe(1);
    expect(overview.totals.istatReadyCount).toBe(1);
    expect(overview.totals.istatIncompleteCount).toBe(1);
  });

  it("ordina il drill-down per urgenza decrescente, poi alfabetico", () => {
    const overview = buildAgencyOverview([
      prop({ propertyId: "calmo", propertyName: "Zeta calmo" }),
      prop({ propertyId: "urgente", propertyName: "Alfa urgente", schedineOverdue: 1 }),
      prop({ propertyId: "medio", propertyName: "Beta medio", checkinsToday: 1 }),
    ]);
    expect(overview.rows.map((r) => r.propertyId)).toEqual(["urgente", "medio", "calmo"]);
  });

  it("a parità di urgenza ordina alfabeticamente (stabile)", () => {
    const overview = buildAgencyOverview([
      prop({ propertyId: "z", propertyName: "Zeta", schedineOverdue: 1 }),
      prop({ propertyId: "a", propertyName: "Alfa", schedineOverdue: 1 }),
    ]);
    expect(overview.rows.map((r) => r.propertyName)).toEqual(["Alfa", "Zeta"]);
  });

  it("marca needsAttention quando manca qualsiasi pezzo e conta gli immobili coinvolti", () => {
    const overview = buildAgencyOverview([
      prop({ propertyId: "ok" }),
      prop({ propertyId: "noCin", hasCin: false }),
      prop({ propertyId: "pending", schedinePending: 2 }),
    ]);
    const byId = new Map(overview.rows.map((r) => [r.propertyId, r]));
    expect(byId.get("ok")?.needsAttention).toBe(false);
    expect(byId.get("noCin")?.needsAttention).toBe(true);
    expect(byId.get("pending")?.needsAttention).toBe(true);
    expect(overview.totals.propertiesNeedingAttention).toBe(2);
  });

  it("popola istatReadiness su ogni riga di drill-down", () => {
    const overview = buildAgencyOverview([
      prop({ propertyId: "r", ross1000Ready: true }),
      prop({ propertyId: "i", ross1000Ready: false }),
    ]);
    const byId = new Map(overview.rows.map((r) => [r.propertyId, r]));
    expect(byId.get("r")?.istatReadiness).toBe("ready");
    expect(byId.get("i")?.istatReadiness).toBe("incomplete");
  });
});
