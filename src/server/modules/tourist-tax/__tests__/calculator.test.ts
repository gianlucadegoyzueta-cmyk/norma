import { describe, expect, it } from "vitest";
import {
  ageAtDate,
  computeTouristTax,
  countNights,
  TouristTaxRateResolutionError,
  type GuestTaxInput,
  type StayTaxInput,
} from "../domain/calculator";
import { parseTouristTaxRule, TouristTaxRuleError } from "../domain/rule";
import { FIRENZE, MILANO, ROMA, SEED_COMUNI, VENEZIA } from "./fixtures/comuni";

// Helper: data UTC a mezzanotte (come i DateTime di Prisma normalizzati).
const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

function guest(id: string, birth: string, exemptionType?: string): GuestTaxInput {
  return { id, birthDate: d(birth), exemptionType: exemptionType ?? null };
}

function stay(
  arrival: string,
  departure: string | null,
  extra?: Partial<StayTaxInput>,
): StayTaxInput {
  return { arrivalDate: d(arrival), departureDate: departure ? d(departure) : null, ...extra };
}

describe("utility di calcolo", () => {
  it("countNights = departure − arrival (giorno di check-out non contato)", () => {
    expect(countNights(d("2026-06-01"), d("2026-06-04"))).toBe(3);
    expect(countNights(d("2026-06-01"), d("2026-06-01"))).toBe(0);
    expect(countNights(d("2026-06-04"), d("2026-06-01"))).toBe(0); // mai negativo
  });

  it("ageAtDate: età compiuti alla data, non arrotondata", () => {
    expect(ageAtDate(d("2016-06-02"), d("2026-06-01"))).toBe(9); // compie 10 il giorno dopo → 9
    expect(ageAtDate(d("2016-06-01"), d("2026-06-01"))).toBe(10); // compleanno esatto → 10
  });
});

describe("validazione regola (le fixture seed sono tutte valide)", () => {
  for (const c of SEED_COMUNI) {
    it(`${c.comuneName}: parseTouristTaxRule accetta la regola seed`, () => {
      expect(() => parseTouristTaxRule(c.rule)).not.toThrow();
    });
  }

  it("rifiuta importi non interi (no float sul denaro)", () => {
    expect(() =>
      parseTouristTaxRule({ ...ROMA.rule, rates: [{ season: "ALL", amountCents: 6.5 }] }),
    ).toThrow(TouristTaxRuleError);
  });

  it("rifiuta una percentuale età fuori 0..100", () => {
    expect(() =>
      parseTouristTaxRule({ ...ROMA.rule, ageReductions: [{ maxAge: 10, reductionPct: 150 }] }),
    ).toThrow(TouristTaxRuleError);
  });

  it("rifiuta un canale di versamento sconosciuto", () => {
    expect(() =>
      parseTouristTaxRule({
        ...ROMA.rule,
        declaration: { ...ROMA.rule.declaration, remittance: { channel: "BONIFICO" } },
      }),
    ).toThrow(TouristTaxRuleError);
  });
});

describe("Roma — 6€/notte, tetto 10, esente <10, surcharge Giubileo", () => {
  it("adulto, 3 notti nel 2024 (no Giubileo) = 3 × 600 = 1800", () => {
    const r = computeTouristTax(
      stay("2024-06-01", "2024-06-04"),
      [guest("a", "1990-01-01")],
      ROMA.rule,
    );
    expect(r.totalCents).toBe(1800);
    expect(r.guests[0].taxedNights).toBe(3);
    expect(r.guests[0].exempt).toBe(false);
  });

  it("surcharge Giubileo 2025: 2 notti × (600+200) = 1600", () => {
    const r = computeTouristTax(
      stay("2025-06-01", "2025-06-03"),
      [guest("a", "1990-01-01")],
      ROMA.rule,
    );
    expect(r.totalCents).toBe(1600);
  });

  it("tetto 10 notti: soggiorno di 12 notti tassa solo 10 (nel 2024 = 6000)", () => {
    const r = computeTouristTax(
      stay("2024-06-01", "2024-06-13"),
      [guest("a", "1990-01-01")],
      ROMA.rule,
    );
    expect(r.guests[0].totalNights).toBe(12);
    expect(r.guests[0].taxedNights).toBe(10);
    expect(r.totalCents).toBe(6000);
    expect(r.notes.some((n) => n.includes("Tetto di 10"))).toBe(true);
  });

  it("minore di 10 anni → esente (0), niente surcharge nemmeno nel 2025", () => {
    const r = computeTouristTax(
      stay("2025-06-01", "2025-06-05"),
      [guest("k", "2020-01-01")],
      ROMA.rule,
    );
    expect(r.totalCents).toBe(0);
    expect(r.guests[0].exempt).toBe(true);
    expect(r.guests[0].reason).toContain("minore esente");
  });

  it("esenzione per categoria (forze dell'ordine) → 0", () => {
    const r = computeTouristTax(
      stay("2024-06-01", "2024-06-05"),
      [guest("p", "1985-01-01", "FORZE_ORDINE")],
      ROMA.rule,
    );
    expect(r.totalCents).toBe(0);
    expect(r.guests[0].reason).toContain("FORZE_ORDINE");
  });

  it("gruppo misto: 2 adulti + 1 bimbo, 2 notti nel 2024 = 2×(2×600) = 2400", () => {
    const r = computeTouristTax(
      stay("2024-06-01", "2024-06-03"),
      [guest("a", "1980-01-01"), guest("b", "1982-01-01"), guest("k", "2019-01-01")],
      ROMA.rule,
    );
    expect(r.totalCents).toBe(2400);
    expect(r.guests.filter((g) => g.exempt)).toHaveLength(1);
  });
});

describe("Firenze — soglia esenzione 12, tetto 7", () => {
  it("11enne esente (<12), 12enne tassato", () => {
    const eleven = computeTouristTax(
      stay("2025-06-01", "2025-06-03"),
      [guest("k", "2014-01-01")],
      FIRENZE.rule,
    );
    expect(eleven.totalCents).toBe(0);
    const twelve = computeTouristTax(
      stay("2025-06-01", "2025-06-03"),
      [guest("k", "2013-01-01")],
      FIRENZE.rule,
    );
    expect(twelve.totalCents).toBe(1200);
  });

  it("tetto 7 notti: 9 notti → tassate 7 = 4200", () => {
    const r = computeTouristTax(
      stay("2025-06-01", "2025-06-10"),
      [guest("a", "1990-01-01")],
      FIRENZE.rule,
    );
    expect(r.guests[0].taxedNights).toBe(7);
    expect(r.totalCents).toBe(4200);
  });
});

describe("Milano — 6,30€, soglia esenzione 18 (alta), tetto 14", () => {
  it("17enne ancora esente (<18)", () => {
    const r = computeTouristTax(
      stay("2025-06-01", "2025-06-03"),
      [guest("t", "2008-01-01")],
      MILANO.rule,
    );
    expect(r.totalCents).toBe(0);
    expect(r.guests[0].exempt).toBe(true);
  });

  it("adulto, 2 notti = 2 × 630 = 1260", () => {
    const r = computeTouristTax(
      stay("2025-06-01", "2025-06-03"),
      [guest("a", "1990-01-01")],
      MILANO.rule,
    );
    expect(r.totalCents).toBe(1260);
  });

  it("tetto 14: soggiorno di 20 notti → 14 × 630 = 8820", () => {
    const r = computeTouristTax(
      stay("2025-06-01", "2025-06-21"),
      [guest("a", "1990-01-01")],
      MILANO.rule,
    );
    expect(r.guests[0].taxedNights).toBe(14);
    expect(r.totalCents).toBe(8820);
  });
});

describe("Venezia — zona + stagione + fascia 10–16 al 50%", () => {
  it("zona CENTRO_STORICO alta stagione: 2 notti a giugno × 500 = 1000", () => {
    const r = computeTouristTax(
      stay("2025-06-01", "2025-06-03", { zone: "CENTRO_STORICO" }),
      [guest("a", "1990-01-01")],
      VENEZIA.rule,
    );
    expect(r.totalCents).toBe(1000);
  });

  it("bassa stagione −30% (dicembre): 2 notti × round(500×0.7=350) = 700", () => {
    const r = computeTouristTax(
      stay("2025-12-01", "2025-12-03", { zone: "CENTRO_STORICO" }),
      [guest("a", "1990-01-01")],
      VENEZIA.rule,
    );
    expect(r.totalCents).toBe(700);
  });

  it("finestra stagionale che scavalca l'anno (febbraio è bassa stagione)", () => {
    const r = computeTouristTax(
      stay("2026-02-10", "2026-02-11", { zone: "CENTRO_STORICO" }),
      [guest("a", "1990-01-01")],
      VENEZIA.rule,
    );
    expect(r.totalCents).toBe(350); // 1 notte −30%
  });

  it("fascia 10–16 al 50%: 13enne alta stagione, 2 notti × round(500×0.5=250) = 500", () => {
    const r = computeTouristTax(
      stay("2025-06-01", "2025-06-03", { zone: "CENTRO_STORICO" }),
      [guest("k", "2012-01-01")],
      VENEZIA.rule,
    );
    expect(r.totalCents).toBe(500);
    expect(r.guests[0].reduced).toBe(true);
    expect(r.guests[0].reductionPct).toBe(50);
  });

  it("under 10 sempre esente, anche in bassa stagione", () => {
    const r = computeTouristTax(
      stay("2025-12-01", "2025-12-05", { zone: "CENTRO_STORICO" }),
      [guest("k", "2020-01-01")],
      VENEZIA.rule,
    );
    expect(r.totalCents).toBe(0);
  });

  it("zona TERRAFERMA usa la sua tariffa (350), DEFAULT per zona ignota (400)", () => {
    const terra = computeTouristTax(
      stay("2025-06-01", "2025-06-02", { zone: "TERRAFERMA" }),
      [guest("a", "1990-01-01")],
      VENEZIA.rule,
    );
    expect(terra.totalCents).toBe(350);
    const unknown = computeTouristTax(
      stay("2025-06-01", "2025-06-02", { zone: "ISOLA_IGNOTA" }),
      [guest("a", "1990-01-01")],
      VENEZIA.rule,
    );
    expect(unknown.totalCents).toBe(400); // cade sulla tariffa DEFAULT
  });
});

describe("casi limite trasversali", () => {
  it("compie gli anni DURANTE il soggiorno: età valutata all'arrivo (resta esente)", () => {
    // Arrivo 2025-06-01, compie 10 anni il 2025-06-03 (durante il soggiorno): all'arrivo ha 9 → esente.
    const r = computeTouristTax(
      stay("2025-06-01", "2025-06-05"),
      [guest("k", "2015-06-03")],
      ROMA.rule,
    );
    expect(r.guests[0].exempt).toBe(true);
  });

  it("departure mancante → stima non disponibile, totale 0 + nota", () => {
    const r = computeTouristTax(stay("2025-06-01", null), [guest("a", "1990-01-01")], ROMA.rule);
    expect(r.totalCents).toBe(0);
    expect(r.notes[0]).toContain("partenza mancante");
  });

  it("arrotondamento esplicito: 633c −30% = round(443.1)=443", () => {
    const ruleWithOdd = parseTouristTaxRule({
      ...VENEZIA.rule,
      rates: [
        {
          zone: "DEFAULT",
          season: { ranges: [{ from: "11-01", to: "03-31" }], modifierPct: -30 },
          amountCents: 633,
        },
      ],
      ageReductions: [],
    });
    const r = computeTouristTax(
      stay("2025-12-01", "2025-12-02"),
      [guest("a", "1990-01-01")],
      ruleWithOdd,
    );
    expect(r.totalCents).toBe(443); // 633 * 0.7 = 443.1 → round 443
  });

  it("regola senza tariffa applicabile → errore esplicito (no calcolo silenzioso)", () => {
    const ruleNoDefault = parseTouristTaxRule({
      ...VENEZIA.rule,
      rates: [{ zone: "CENTRO_STORICO", season: "ALL", amountCents: 500 }],
    });
    expect(() =>
      computeTouristTax(
        stay("2025-06-01", "2025-06-02", { zone: "TERRAFERMA" }),
        [guest("a", "1990-01-01")],
        ruleNoDefault,
      ),
    ).toThrow(TouristTaxRateResolutionError);
  });
});
