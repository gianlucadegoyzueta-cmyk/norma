import { describe, expect, it } from "vitest";
import { ANNUAL_PLAN, MONTHLY_PLAN, formatEuroCents, planByLookupKey } from "../domain/plan";
import { epochSecondsToDate, mapStripeStatus, planForLookupKey } from "../domain/stripe-mapping";

describe("mapStripeStatus", () => {
  it("mappa gli status noti", () => {
    expect(mapStripeStatus("active")).toBe("ACTIVE");
    expect(mapStripeStatus("trialing")).toBe("TRIALING");
    expect(mapStripeStatus("past_due")).toBe("PAST_DUE");
    expect(mapStripeStatus("canceled")).toBe("CANCELED");
    expect(mapStripeStatus("incomplete_expired")).toBe("INCOMPLETE_EXPIRED");
    expect(mapStripeStatus("unpaid")).toBe("UNPAID");
    expect(mapStripeStatus("paused")).toBe("PAUSED");
  });

  it("uno status sconosciuto → null", () => {
    expect(mapStripeStatus("boh")).toBeNull();
  });
});

describe("planForLookupKey", () => {
  it("risale al piano dalla lookup key", () => {
    expect(planForLookupKey(ANNUAL_PLAN.lookupKey)).toBe("ANNUAL");
    expect(planForLookupKey(MONTHLY_PLAN.lookupKey)).toBe("MONTHLY");
  });

  it("null/sconosciuta → null", () => {
    expect(planForLookupKey(null)).toBeNull();
    expect(planForLookupKey("altro")).toBeNull();
  });
});

describe("catalogo piani", () => {
  it("prezzi e intervalli da Piano Marketing", () => {
    expect(ANNUAL_PLAN.amountCents).toBe(12000);
    expect(ANNUAL_PLAN.interval).toBe("year");
    expect(ANNUAL_PLAN.recommended).toBe(true);
    expect(MONTHLY_PLAN.amountCents).toBe(1400);
    expect(MONTHLY_PLAN.interval).toBe("month");
  });

  it("planByLookupKey ritrova il piano", () => {
    expect(planByLookupKey("norma_annual_v1")).toBe(ANNUAL_PLAN);
    expect(planByLookupKey("inesistente")).toBeNull();
  });

  it("formatEuroCents formatta in italiano", () => {
    expect(formatEuroCents(12000)).toBe("120,00 €");
    expect(formatEuroCents(1400)).toBe("14,00 €");
  });
});

describe("epochSecondsToDate", () => {
  it("converte secondi epoch in Date", () => {
    expect(epochSecondsToDate(1_750_000_000)).toEqual(new Date(1_750_000_000_000));
  });
  it("null → null", () => {
    expect(epochSecondsToDate(null)).toBeNull();
    expect(epochSecondsToDate(undefined)).toBeNull();
  });
});
