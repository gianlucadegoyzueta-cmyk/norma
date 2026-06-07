import { describe, expect, it } from "vitest";
import { aggregateMonth, type IstatStayRecord, type Provenance } from "../aggregate";

const FR: Provenance = { kind: "ESTERO", countryCode: "FR", countryName: "Francia" };
const DE: Provenance = { kind: "ESTERO", countryCode: "DE", countryName: "Germania" };
const RM: Provenance = { kind: "ITALIA", provincia: "RM" };

/** Helper: data di calendario a mezzogiorno UTC (come le memorizza l'app). */
const day = (s: string) => new Date(`${s}T12:00:00.000Z`);
const rec = (
  arrival: string,
  departure: string | null,
  provenance: Provenance,
): IstatStayRecord => ({
  arrival: day(arrival),
  departure: departure ? day(departure) : null,
  provenance,
});

describe("aggregateMonth", () => {
  it("conta arrivi (check-in nel mese) e presenze (notti nel mese)", () => {
    // 3 notti a maggio (10,11,12), arrivo a maggio
    const r = aggregateMonth("2026-05", [rec("2026-05-10", "2026-05-13", FR)]);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ label: "Francia", arrivi: 1, presenze: 3 });
    expect(r.totals).toEqual({ arrivi: 1, presenze: 3 });
  });

  it("ripartisce le notti sul confine del mese (arrivo a maggio, parte a giugno)", () => {
    // 30/05 → 02/06: notti 30,31 maggio (2) e 01 giugno (1)
    const stay = rec("2026-05-30", "2026-06-02", DE);
    const may = aggregateMonth("2026-05", [stay]);
    const jun = aggregateMonth("2026-06", [stay]);
    expect(may.rows[0]).toMatchObject({ arrivi: 1, presenze: 2 }); // arrivo a maggio
    expect(jun.rows[0]).toMatchObject({ arrivi: 0, presenze: 1 }); // niente arrivo a giugno, 1 notte
  });

  it("soggiorno ancora in corso (partenza null) → presente fino a fine mese", () => {
    // arrivo 28/05, nessuna partenza: notti 28,29,30,31 = 4
    const r = aggregateMonth("2026-05", [rec("2026-05-28", null, FR)]);
    expect(r.rows[0]).toMatchObject({ arrivi: 1, presenze: 4 });
  });

  it("raggruppa per provenienza e ordina per presenze desc", () => {
    const r = aggregateMonth("2026-05", [
      rec("2026-05-01", "2026-05-03", FR), // FR: 2 notti
      rec("2026-05-01", "2026-05-06", DE), // DE: 5 notti
      rec("2026-05-10", "2026-05-12", RM), // RM: 2 notti
      rec("2026-05-20", "2026-05-21", FR), // FR: +1 notte, +1 arrivo
    ]);
    expect(r.rows.map((x) => x.label)).toEqual(["Germania", "Francia", "RM"]);
    const fr = r.rows.find((x) => x.label === "Francia")!;
    expect(fr).toMatchObject({ arrivi: 2, presenze: 3 });
    expect(r.totals).toEqual({ arrivi: 4, presenze: 10 });
  });

  it("esclude i soggiorni fuori dal mese", () => {
    const r = aggregateMonth("2026-05", [rec("2026-04-01", "2026-04-05", FR)]);
    expect(r.rows).toHaveLength(0);
    expect(r.totals).toEqual({ arrivi: 0, presenze: 0 });
  });

  it("rifiuta un periodo non valido", () => {
    expect(() => aggregateMonth("2026-13", [])).toThrow();
    expect(() => aggregateMonth("2026-5", [])).toThrow();
  });
});
