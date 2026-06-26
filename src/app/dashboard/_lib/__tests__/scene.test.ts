import { describe, expect, it } from "vitest";
import type { DashboardData, DashboardProposal } from "../data";
import { buildSceneCopy } from "../scene";

/**
 * Blinda l'accuratezza dei claim di compliance nei KPI/copy della dashboard: con schedine
 * PENDING/UNVERIFIED (non ancora confermate) NON si deve dire "tutti in regola"/"posizione
 * regolare", anche se nulla è scaduto (overdueCount === 0 → positionRegular true).
 */

const NOW = new Date("2026-06-23T09:00:00Z");

function makeData(overrides: {
  positionRegular: boolean;
  pendingSchedine: number;
  guestsThisMonth?: number;
  thingsDone?: number;
}): DashboardData {
  const { positionRegular, pendingSchedine, guestsThisMonth = 4, thingsDone = 0 } = overrides;
  return {
    positionRegular,
    pendingSchedine,
    overdueSchedine: positionRegular ? 0 : 1,
    istat: { ready: 0, incomplete: 0, assisted: 0, unrouted: 0, total: 0, monthLabel: "giugno" },
    receiptRef: null,
    acquiredYesterday: 0,
    hero: { thingsDone },
    kpis: {
      occupancyPct: 50,
      occupancyTrend: "sui soggiorni del mese",
      occupiedNights: 10,
      capacityNights: 20,
      propertyCount: 1,
      guestsThisMonth,
      pendingSchedine,
      taxAccruedEuros: 0,
      taxTrend: "nessun importo maturato",
      hoursSaved: 1,
    },
    proposals: [],
    agenda: [],
    diary: [],
  };
}

const NO_PROPOSALS: DashboardProposal[] = [];

function guestKpiText(data: DashboardData): { trend: string; statoSchedine: string } {
  const scene = buildSceneCopy(data, { firstName: null, now: NOW, proposals: NO_PROPOSALS });
  const guestKpi = scene.kpis.find((k) => k.label.startsWith("ospiti registrati"));
  if (!guestKpi) throw new Error("KPI ospiti registrati non trovato");
  const stato = guestKpi.detail?.rows.find((r) => r.label === "Stato schedine");
  return { trend: guestKpi.trend ?? "", statoSchedine: stato?.value ?? "" };
}

describe("buildSceneCopy — accuratezza compliance", () => {
  it("NON dice 'in regola' nel kicker quando ci sono schedine da confermare", () => {
    const scene = buildSceneCopy(makeData({ positionRegular: true, pendingSchedine: 2 }), {
      firstName: null,
      now: NOW,
      proposals: NO_PROPOSALS,
    });
    expect(scene.kicker).not.toContain("posizione regolare");
    expect(scene.kicker).toContain("2 in coda");
  });

  it("dice 'posizione regolare' nel kicker solo se nulla è scaduto E nulla è in attesa", () => {
    const scene = buildSceneCopy(makeData({ positionRegular: true, pendingSchedine: 0 }), {
      firstName: null,
      now: NOW,
      proposals: NO_PROPOSALS,
    });
    expect(scene.kicker).toContain("posizione regolare");
  });

  it("dice 'da sistemare' quando ci sono scadenze superate", () => {
    const scene = buildSceneCopy(makeData({ positionRegular: false, pendingSchedine: 0 }), {
      firstName: null,
      now: NOW,
      proposals: NO_PROPOSALS,
    });
    expect(scene.kicker).toContain("da sistemare");
  });

  it("il KPI ospiti registrati NON dice 'tutti/tutte in regola' con schedine pendenti", () => {
    const { trend, statoSchedine } = guestKpiText(
      makeData({ positionRegular: true, pendingSchedine: 3 }),
    );
    expect(trend).not.toContain("in regola");
    expect(trend).toContain("3 schedine in coda");
    expect(statoSchedine).toBe("3 in coda");
  });

  it("il KPI ospiti registrati dice 'in regola' solo senza pendenti né scadenze", () => {
    const { trend, statoSchedine } = guestKpiText(
      makeData({ positionRegular: true, pendingSchedine: 0 }),
    );
    expect(trend).toContain("in regola");
    expect(statoSchedine).toBe("tutte in regola");
  });

  it("il sub hero non afferma 'in regola' quando restano schedine da confermare", () => {
    const scene = buildSceneCopy(makeData({ positionRegular: true, pendingSchedine: 1 }), {
      firstName: null,
      now: NOW,
      proposals: NO_PROPOSALS,
    });
    const subText = `${scene.sub.bold ?? ""}${scene.sub.text}`;
    expect(subText).not.toContain("Tutto in regola");
    expect(subText).toContain("coda per l'invio su mandato");
  });

  it("il sub hero afferma 'Tutto in regola' solo quando tutto è davvero adempiuto", () => {
    const scene = buildSceneCopy(makeData({ positionRegular: true, pendingSchedine: 0 }), {
      firstName: null,
      now: NOW,
      proposals: NO_PROPOSALS,
    });
    const subText = `${scene.sub.bold ?? ""}${scene.sub.text}`;
    expect(subText).toContain("Tutto in regola");
  });
});
