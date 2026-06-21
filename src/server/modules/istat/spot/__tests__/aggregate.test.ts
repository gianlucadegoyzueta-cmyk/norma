import { describe, expect, it } from "vitest";
import {
  computeSpotMovimenti,
  SpotAggregateError,
  type SpotAggregateStay,
  type SpotGuest,
} from "../aggregate";

const PERIOD = "2026-05";

function guest(over: Partial<SpotGuest> = {}): SpotGuest {
  return {
    codiceClienteSr: "g1",
    tipoAlloggiato: "OSPITE_SINGOLO",
    sesso: "M",
    cittadinanzaCode: "100000100",
    residenza: { comuneResidenzaCode: "412058091" },
    occupaPostoLetto: true,
    eta: 40,
    ...over,
  };
}

function stay(over: Partial<SpotAggregateStay> = {}): SpotAggregateStay {
  return {
    stayId: "s1",
    arrivalDate: new Date("2026-05-10T12:00:00Z"),
    departureDate: new Date("2026-05-12T12:00:00Z"),
    guests: [guest()],
    ...over,
  };
}

function compute(stays: SpotAggregateStay[], closedDays?: string[]) {
  return computeSpotMovimenti({
    period: PERIOD,
    capacity: { camereDisponibili: 1, lettiDisponibili: 2 },
    closedDays,
    stays,
  });
}

const byDay = (res: ReturnType<typeof compute>, iso: string) =>
  res.giorni.find((g) => g.data === iso)!;

describe("computeSpotMovimenti — flusso base", () => {
  it("arrivo, giorni intermedi NM, partenza", () => {
    const res = compute([stay()]);
    expect(byDay(res, "2026-05-10").stato).toBe("MP");
    expect(byDay(res, "2026-05-10").arrivi).toHaveLength(1);
    expect(byDay(res, "2026-05-11").stato).toBe("NM");
    expect(byDay(res, "2026-05-12").stato).toBe("MP");
    expect(byDay(res, "2026-05-12").partenze).toEqual(["g1"]);
    // giorno senza presenza/movimento
    expect(byDay(res, "2026-05-01").stato).toBe("NM");
  });

  it("presenze = notti-persona; conteggi arrivi/partenze in persone", () => {
    const res = compute([stay()]);
    expect(res.presenze).toBe(2); // notti 10 e 11
    expect(res.arriviTotali).toBe(1);
    expect(res.partenzeTotali).toBe(1);
  });

  it("datistruttura solo nei giorni MP; camere occupate sui soggiorni attivi la notte", () => {
    const res = compute([stay()]);
    expect(byDay(res, "2026-05-10").datiStruttura?.camereOccupate).toBe(1);
    expect(byDay(res, "2026-05-12").datiStruttura?.camereOccupate).toBe(0); // partito quella notte
    expect(byDay(res, "2026-05-11").datiStruttura).toBeUndefined(); // NM
  });

  it("camere occupate cap alla capacità", () => {
    const res = computeSpotMovimenti({
      period: PERIOD,
      capacity: { camereDisponibili: 1, lettiDisponibili: 2 },
      stays: [
        stay({ stayId: "a", guests: [guest({ codiceClienteSr: "a1" })] }),
        stay({ stayId: "b", guests: [guest({ codiceClienteSr: "b1" })] }),
      ],
    });
    // due soggiorni attivi ma 1 sola camera disponibile → cap a 1
    expect(byDay(res, "2026-05-11").stato).toBe("NM");
    expect(byDay(res, "2026-05-10").datiStruttura?.camereOccupate).toBe(1);
  });
});

describe("computeSpotMovimenti — gruppi e componenti", () => {
  it("capofamiglia con membro → arrivo con componente annidato", () => {
    const res = compute([
      stay({
        guests: [
          guest({ codiceClienteSr: "capo", tipoAlloggiato: "CAPO_FAMIGLIA" }),
          guest({
            codiceClienteSr: "m1",
            tipoAlloggiato: "FAMILIARE",
            leaderCodice: "capo",
            eta: 10,
          }),
        ],
      }),
    ]);
    const arrivi = byDay(res, "2026-05-10").arrivi!;
    expect(arrivi).toHaveLength(1);
    expect(arrivi[0].codiceClienteSr).toBe("capo");
    expect(arrivi[0].componenti).toHaveLength(1);
    expect(arrivi[0].componenti![0].codiceClienteSr).toBe("m1");
    // partenze: solo il codice del capo (i membri seguono)
    expect(byDay(res, "2026-05-12").partenze).toEqual(["capo"]);
  });

  it("due ospiti singoli nello stesso soggiorno → due arrivi senza componenti", () => {
    const res = compute([
      stay({
        guests: [guest({ codiceClienteSr: "x" }), guest({ codiceClienteSr: "y" })],
      }),
    ]);
    const arrivi = byDay(res, "2026-05-10").arrivi!;
    expect(arrivi).toHaveLength(2);
    expect(arrivi.every((a) => a.componenti === undefined)).toBe(true);
    expect(byDay(res, "2026-05-12").partenze).toEqual(["x", "y"]);
  });

  it("membro senza capo corrispondente → errore (mai inventare l'aggancio)", () => {
    expect(() =>
      compute([
        stay({
          guests: [
            guest({ codiceClienteSr: "s", tipoAlloggiato: "OSPITE_SINGOLO" }),
            guest({ codiceClienteSr: "m", tipoAlloggiato: "FAMILIARE", leaderCodice: "altro" }),
          ],
        }),
      ]),
    ).toThrow(SpotAggregateError);
  });
});

describe("computeSpotMovimenti — dayuse e chiusura", () => {
  it("arrivo e partenza lo stesso giorno → MP con dayuse, non occupa la notte", () => {
    const res = compute([
      stay({
        arrivalDate: new Date("2026-05-10T09:00:00Z"),
        departureDate: new Date("2026-05-10T20:00:00Z"),
      }),
    ]);
    const g = byDay(res, "2026-05-10");
    expect(g.stato).toBe("MP");
    expect(g.arrivi![0].dayUse).toBe(true);
    expect(g.partenze).toEqual(["g1"]);
    expect(g.datiStruttura?.camereOccupate).toBe(0); // nessuna notte trascorsa
    expect(res.presenze).toBe(0);
  });

  it("giorno chiuso → EC senza figli", () => {
    const res = compute([stay()], ["2026-05-11"]);
    const g = byDay(res, "2026-05-11");
    expect(g.stato).toBe("EC");
    expect(g.arrivi).toBeUndefined();
    expect(g.datiStruttura).toBeUndefined();
  });
});
