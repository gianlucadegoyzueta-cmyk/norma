import { describe, expect, it } from "vitest";
import { computeUmbriaC59, type UmbriaAggregateStay, type UmbriaGuest } from "../aggregate";

const PERIOD = "2026-05";

function guest(code = "PG", descr = "PERUGIA"): UmbriaGuest {
  return { provenienzaCode: code, provenienzaDescrizione: descr };
}

function stay(over: Partial<UmbriaAggregateStay> = {}): UmbriaAggregateStay {
  return {
    arrivalDate: new Date("2026-05-10T12:00:00Z"),
    departureDate: new Date("2026-05-12T12:00:00Z"),
    guests: [guest()],
    ...over,
  };
}

function run(stays: UmbriaAggregateStay[], closedDays?: string[]) {
  return computeUmbriaC59({
    period: PERIOD,
    denominazione: "Casa Test",
    capacity: { camereDisponibili: 1 },
    closedDays,
    stays,
  });
}

const fileFor = (res: ReturnType<typeof run>, iso: string) =>
  res.files.find((f) => f.data === iso)!;

describe("computeUmbriaC59 — presenze e provenienze", () => {
  it("presenti notte precedente, arrivati, partiti, camere per giorno", () => {
    const res = run([stay()]);

    const d10 = fileFor(res, "2026-05-10");
    expect(d10.presentiNottePrecedente).toBe(0);
    expect(d10.arrivati).toBe(1);
    expect(d10.partiti).toBe(0);
    expect(d10.camereOccupate).toBe(1);
    expect(d10.provenienze).toEqual([
      { code: "PG", descrizione: "PERUGIA", arrivati: 1, partiti: 0 },
    ]);

    const d11 = fileFor(res, "2026-05-11");
    expect(d11.presentiNottePrecedente).toBe(1);
    expect(d11.arrivati).toBe(0);
    expect(d11.partiti).toBe(0);
    expect(d11.camereOccupate).toBe(1);
    expect(d11.provenienze).toEqual([]);

    const d12 = fileFor(res, "2026-05-12");
    expect(d12.presentiNottePrecedente).toBe(1);
    expect(d12.partiti).toBe(1);
    expect(d12.camereOccupate).toBe(0); // partito quella notte
    expect(d12.provenienze).toEqual([
      { code: "PG", descrizione: "PERUGIA", arrivati: 0, partiti: 1 },
    ]);
  });

  it("presenze = notti-persona; totali arrivi/partenze", () => {
    const res = run([stay()]);
    expect(res.presenze).toBe(2);
    expect(res.arriviTotali).toBe(1);
    expect(res.partenzeTotali).toBe(1);
  });

  it("più ospiti stessa provenienza lo stesso giorno → conteggio sommato", () => {
    const res = run([stay({ guests: [guest("PG", "PERUGIA"), guest("PG", "PERUGIA")] })]);
    expect(fileFor(res, "2026-05-10").provenienze).toEqual([
      { code: "PG", descrizione: "PERUGIA", arrivati: 2, partiti: 0 },
    ]);
  });

  it("provenienze diverse → righe distinte ordinate per codice", () => {
    const res = run([stay({ guests: [guest("RM", "ROMA"), guest("D", "GERMANIA")] })]);
    const rows = fileFor(res, "2026-05-10").provenienze;
    expect(rows.map((r) => r.code)).toEqual(["D", "RM"]); // ordine per codice
  });

  it("giorno chiuso non conta nelle presenze", () => {
    // soggiorno 05-10→05-12 (notti 10,11); 05-11 chiuso → presenze = solo notte 10
    const res = run([stay()], ["2026-05-11"]);
    expect(fileFor(res, "2026-05-11").camereOccupate).toBe(0);
    expect(res.presenze).toBe(1);
  });

  it("soggiorno che attraversa l'inizio periodo → presente la prima notte", () => {
    const res = run([
      stay({
        arrivalDate: new Date("2026-04-28T12:00:00Z"),
        departureDate: new Date("2026-05-03T12:00:00Z"),
      }),
    ]);
    // nessun arrivo nel periodo (arrivato ad aprile), ma presente le prime notti di maggio
    expect(fileFor(res, "2026-05-01").presentiNottePrecedente).toBe(1);
    expect(fileFor(res, "2026-05-01").camereOccupate).toBe(1);
    expect(fileFor(res, "2026-05-03").partiti).toBe(1);
    expect(res.arriviTotali).toBe(0); // l'arrivo è fuori periodo
  });
});
