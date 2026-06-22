import { describe, expect, it } from "vitest";
import { computeMovimenti, type AggregateStay } from "../aggregate";
import type { ArrivoInput, GiornoMovimento } from "../tracciato-xml";

function guest(idswh: string, over: Partial<ArrivoInput> = {}): ArrivoInput {
  return {
    idswh,
    tipoAlloggiato: "OSPITE_SINGOLO",
    sesso: "M",
    cittadinanzaCode: "100000100",
    statoResidenzaCode: "100000100",
    luogoResidenza: "403015146",
    dataNascita: "1990-01-01",
    tipoTurismo: "ALTRO",
    mezzoTrasporto: "AUTO",
    ...over,
  };
}

function stay(over: Partial<AggregateStay> = {}): AggregateStay {
  return {
    stayId: "s1",
    arrivalDate: new Date("2026-05-01T00:00:00Z"),
    departureDate: new Date("2026-05-04T00:00:00Z"),
    guests: [guest("CK-1")],
    ...over,
  };
}

const CAP = { camereDisponibili: 16, lettiDisponibili: 34 };

function dayOf(res: { giorni: GiornoMovimento[] }, iso: string): GiornoMovimento {
  const g = res.giorni.find((x) => x.data === iso);
  if (!g) throw new Error(`giorno ${iso} non trovato`);
  return g;
}

describe("computeMovimenti", () => {
  it("genera un movimento per OGNI giorno del mese (movimenti zero inclusi)", () => {
    const res = computeMovimenti({ period: "2026-05", capacity: CAP, stays: [] });
    expect(res.giorni).toHaveLength(31);
    expect(res.arriviTotali).toBe(0);
    expect(res.giorni.every((g) => g.struttura.aperta)).toBe(true);
  });

  it("arrivi sul giorno di check-in, partenze sul giorno di check-out", () => {
    const res = computeMovimenti({ period: "2026-05", capacity: CAP, stays: [stay()] });
    expect(dayOf(res, "2026-05-01").arrivi).toHaveLength(1);
    expect(dayOf(res, "2026-05-04").partenze).toHaveLength(1);
    expect(dayOf(res, "2026-05-04").partenze[0]).toMatchObject({
      idswh: "CK-1",
      dataArrivo: "2026-05-01",
    });
    expect(res.arriviTotali).toBe(1);
    expect(res.partenzeTotali).toBe(1);
  });

  it("occupazione: notti 01-03 occupate (1), presenze = 3", () => {
    const res = computeMovimenti({ period: "2026-05", capacity: CAP, stays: [stay()] });
    expect(dayOf(res, "2026-05-01").struttura.camereOccupate).toBe(1);
    expect(dayOf(res, "2026-05-03").struttura.camereOccupate).toBe(1);
    expect(dayOf(res, "2026-05-04").struttura.camereOccupate).toBe(0); // giorno di partenza non conta
    expect(res.presenze).toBe(3);
  });

  it("partenza nel mese anche se l'arrivo era nel mese precedente", () => {
    const res = computeMovimenti({
      period: "2026-05",
      capacity: CAP,
      stays: [
        stay({
          arrivalDate: new Date("2026-04-28T00:00:00Z"),
          departureDate: new Date("2026-05-02T00:00:00Z"),
          guests: [guest("CK-X")],
        }),
      ],
    });
    // nessun arrivo a maggio (era ad aprile), ma la partenza sì
    expect(res.arriviTotali).toBe(0);
    expect(dayOf(res, "2026-05-02").partenze).toHaveLength(1);
    expect(dayOf(res, "2026-05-01").struttura.camereOccupate).toBe(1); // attivo la notte dell'1
  });

  it("occupazione somma più soggiorni sovrapposti, cap a camereDisponibili", () => {
    const res = computeMovimenti({
      period: "2026-05",
      capacity: { camereDisponibili: 1, lettiDisponibili: 2 }, // cap a 1
      stays: [
        stay({ stayId: "a", guests: [guest("A")] }),
        stay({ stayId: "b", guests: [guest("B")] }),
      ],
    });
    expect(dayOf(res, "2026-05-02").struttura.camereOccupate).toBe(1); // 2 attivi ma cap=1
  });

  it("giorni di chiusura → apertura NO e zero occupazione", () => {
    const res = computeMovimenti({
      period: "2026-05",
      capacity: CAP,
      closedDays: ["2026-05-02"],
      stays: [stay()],
    });
    const chiuso = dayOf(res, "2026-05-02");
    expect(chiuso.struttura.aperta).toBe(false);
    expect(chiuso.struttura.camereOccupate).toBe(0);
  });

  it("gruppo: più ospiti nello stesso soggiorno → più arrivi/partenze", () => {
    const res = computeMovimenti({
      period: "2026-05",
      capacity: CAP,
      stays: [
        stay({
          guests: [
            guest("CAPO", { tipoAlloggiato: "CAPO_FAMIGLIA" }),
            guest("FIG", { tipoAlloggiato: "FAMILIARE", idCapo: "CAPO" }),
          ],
        }),
      ],
    });
    expect(dayOf(res, "2026-05-01").arrivi).toHaveLength(2);
    expect(dayOf(res, "2026-05-04").partenze).toHaveLength(2);
  });
});
