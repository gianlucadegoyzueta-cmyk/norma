import { describe, expect, it } from "vitest";
import {
  assertValidTakeRateBps,
  computeNormaFee,
  DEFAULT_TAKE_RATE_BPS,
  formatTakeRateBps,
  InvalidTakeRateError,
  MAX_TAKE_RATE_BPS,
} from "../domain/take-rate";
import { resolveTakeRateBps } from "../domain/take-rate-config";

describe("computeNormaFee — caso standard", () => {
  it("120,00 € @ 2,5% → fee 3,00 €, netto 117,00 €", () => {
    const f = computeNormaFee(12000, 250);
    expect(f.normaFeeCents).toBe(300);
    expect(f.comuneNetCents).toBe(11700);
    expect(f.takeRateBps).toBe(250);
    expect(f.grossCents).toBe(12000);
  });

  it("Roma trimestrale tipica 24,00 € @ 1% → fee 0,24 €, netto 23,76 €", () => {
    const f = computeNormaFee(2400, 100);
    expect(f.normaFeeCents).toBe(24);
    expect(f.comuneNetCents).toBe(2376);
  });

  it("invariante fee + netto = lordo per molti importi e rate", () => {
    for (const gross of [0, 1, 99, 100, 633, 2400, 12345, 999999]) {
      for (const bps of [0, 1, 100, 250, 333, 1000, 9999, MAX_TAKE_RATE_BPS]) {
        const f = computeNormaFee(gross, bps);
        expect(f.normaFeeCents + f.comuneNetCents).toBe(gross);
        expect(f.normaFeeCents).toBeGreaterThanOrEqual(0);
        expect(f.comuneNetCents).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("computeNormaFee — esenzioni / lordo zero", () => {
  it("soggiorno tutto esente (lordo 0) → fee 0, netto 0, a qualunque rate", () => {
    expect(computeNormaFee(0, 0)).toMatchObject({ normaFeeCents: 0, comuneNetCents: 0 });
    expect(computeNormaFee(0, 250)).toMatchObject({ normaFeeCents: 0, comuneNetCents: 0 });
    expect(computeNormaFee(0, MAX_TAKE_RATE_BPS)).toMatchObject({
      normaFeeCents: 0,
      comuneNetCents: 0,
    });
  });

  it("take-rate 0 (default, opt-in) → fee 0, netto = lordo", () => {
    const f = computeNormaFee(5000, DEFAULT_TAKE_RATE_BPS);
    expect(f.normaFeeCents).toBe(0);
    expect(f.comuneNetCents).toBe(5000);
  });
});

describe("computeNormaFee — arrotondamenti in centesimi (half-up)", () => {
  it("arrotonda per eccesso a .5 di centesimo (half-up)", () => {
    // 101 cent @ 500 bps = 5,05 → 5 (è 5.05, round → 5)
    expect(computeNormaFee(101, 500).normaFeeCents).toBe(5);
    // 110 cent @ 500 bps = 5,5 → 6 (half-up)
    expect(computeNormaFee(110, 500).normaFeeCents).toBe(6);
    // 30 cent @ 500 bps = 1,5 → 2 (half-up)
    expect(computeNormaFee(30, 500).normaFeeCents).toBe(2);
  });

  it("rate con decimali (1,75% = 175 bps) resta intero sui centesimi", () => {
    // 1000 cent @ 175 bps = 17,5 → 18 (half-up); netto = 982
    const f = computeNormaFee(1000, 175);
    expect(f.normaFeeCents).toBe(18);
    expect(f.comuneNetCents).toBe(982);
    expect(f.normaFeeCents + f.comuneNetCents).toBe(1000);
  });

  it("importo dispari che non divide netto: il netto assorbe il resto (mai centesimi persi)", () => {
    // 633 cent @ 333 bps = 21,0789 → 21; netto 612; somma 633
    const f = computeNormaFee(633, 333);
    expect(f.normaFeeCents).toBe(21);
    expect(f.comuneNetCents).toBe(612);
    expect(f.normaFeeCents + f.comuneNetCents).toBe(633);
  });
});

describe("computeNormaFee — input invalidi", () => {
  it("rifiuta lordo negativo o non intero", () => {
    expect(() => computeNormaFee(-1, 100)).toThrow(RangeError);
    expect(() => computeNormaFee(10.5, 100)).toThrow(RangeError);
  });

  it("rifiuta take-rate fuori 0..MAX o non intera", () => {
    expect(() => computeNormaFee(1000, -1)).toThrow(InvalidTakeRateError);
    expect(() => computeNormaFee(1000, MAX_TAKE_RATE_BPS + 1)).toThrow(InvalidTakeRateError);
    expect(() => computeNormaFee(1000, 12.3)).toThrow(InvalidTakeRateError);
  });

  it("assertValidTakeRateBps accetta gli estremi 0 e MAX", () => {
    expect(() => assertValidTakeRateBps(0)).not.toThrow();
    expect(() => assertValidTakeRateBps(MAX_TAKE_RATE_BPS)).not.toThrow();
  });
});

describe("resolveTakeRateBps — precedenza comune → org → default", () => {
  it("override comune vince su org", () => {
    expect(resolveTakeRateBps({ comuneBps: 500, orgDefaultBps: 250 })).toEqual({
      bps: 500,
      origin: "COMUNE",
    });
  });

  it("senza comune usa il default org", () => {
    expect(resolveTakeRateBps({ comuneBps: null, orgDefaultBps: 250 })).toEqual({
      bps: 250,
      origin: "ORGANIZATION",
    });
  });

  it("senza nulla configurato → DEFAULT (0)", () => {
    expect(resolveTakeRateBps({})).toEqual({ bps: DEFAULT_TAKE_RATE_BPS, origin: "DEFAULT" });
  });

  it("comune = 0 è un valore esplicito valido (azzera la commissione anche se org > 0)", () => {
    expect(resolveTakeRateBps({ comuneBps: 0, orgDefaultBps: 250 })).toEqual({
      bps: 0,
      origin: "COMUNE",
    });
  });

  it("una take-rate malformata in config lancia (barriera del dominio)", () => {
    expect(() => resolveTakeRateBps({ comuneBps: 99999 })).toThrow(InvalidTakeRateError);
  });
});

describe("formatTakeRateBps", () => {
  it("formatta bps in percentuale italiana", () => {
    expect(formatTakeRateBps(100)).toBe("1%");
    expect(formatTakeRateBps(250)).toBe("2,5%");
    expect(formatTakeRateBps(0)).toBe("0%");
    expect(formatTakeRateBps(175)).toBe("1,75%");
  });
});
