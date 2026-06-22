import { describe, expect, it } from "vitest";
import {
  assertValidDeclarationTransition,
  InvalidDeclarationTransitionError,
  isDeclarationRecomputable,
  isDeclarationTerminal,
  isValidDeclarationTransition,
} from "../domain/declaration";
import { InvalidPeriodError, periodBounds, periodLabel, periodOf } from "../domain/period";
import { toDeclarationCsv } from "../domain/export-csv";

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("macchina a stati dichiarazione", () => {
  it("percorso felice DRAFT→READY→SUBMITTED→PAID", () => {
    expect(isValidDeclarationTransition("DRAFT", "READY")).toBe(true);
    expect(isValidDeclarationTransition("READY", "SUBMITTED")).toBe(true);
    expect(isValidDeclarationTransition("SUBMITTED", "PAID")).toBe(true);
  });

  it("READY può tornare a DRAFT (ricalcolo); SUBMITTED no", () => {
    expect(isValidDeclarationTransition("READY", "DRAFT")).toBe(true);
    expect(isValidDeclarationTransition("SUBMITTED", "DRAFT")).toBe(false);
  });

  it("PAID e CANCELLED terminali", () => {
    expect(isDeclarationTerminal("PAID")).toBe(true);
    expect(isDeclarationTerminal("CANCELLED")).toBe(true);
    expect(isDeclarationTerminal("DRAFT")).toBe(false);
  });

  it("non si annulla una dichiarazione già inviata", () => {
    expect(isValidDeclarationTransition("SUBMITTED", "CANCELLED")).toBe(false);
    expect(() => assertValidDeclarationTransition("SUBMITTED", "CANCELLED")).toThrow(
      InvalidDeclarationTransitionError,
    );
  });

  it("ricalcolabile solo in DRAFT/READY", () => {
    expect(isDeclarationRecomputable("DRAFT")).toBe(true);
    expect(isDeclarationRecomputable("READY")).toBe(true);
    expect(isDeclarationRecomputable("SUBMITTED")).toBe(false);
  });
});

describe("periodi", () => {
  it("periodOf per cadenza", () => {
    expect(periodOf(d("2026-05-20"), "MONTHLY")).toBe("2026-05");
    expect(periodOf(d("2026-05-20"), "QUARTERLY")).toBe("2026-Q2");
    expect(periodOf(d("2026-05-20"), "ANNUAL")).toBe("2026");
    expect(periodOf(d("2026-01-01"), "QUARTERLY")).toBe("2026-Q1");
    expect(periodOf(d("2026-12-31"), "QUARTERLY")).toBe("2026-Q4");
  });

  it("periodBounds [start,end) esclusivo", () => {
    expect(periodBounds("2026-05")).toEqual({ start: d("2026-05-01"), end: d("2026-06-01") });
    expect(periodBounds("2026-Q2")).toEqual({ start: d("2026-04-01"), end: d("2026-07-01") });
    expect(periodBounds("2026")).toEqual({ start: d("2026-01-01"), end: d("2027-01-01") });
  });

  it("periodLabel leggibile", () => {
    expect(periodLabel("2026-05")).toBe("Maggio 2026");
    expect(periodLabel("2026-Q2")).toBe("2º trimestre 2026");
    expect(periodLabel("2026")).toBe("Anno 2026");
  });

  it("periodo malformato → errore", () => {
    expect(() => periodBounds("2026/05")).toThrow(InvalidPeriodError);
    expect(() => periodBounds("2026-13")).toThrow(InvalidPeriodError);
  });
});

describe("export CSV", () => {
  it("intestazione, righe e totale con importi IT + quoting", () => {
    const csv = toDeclarationCsv({
      comuneName: "Roma",
      periodLabel: "Maggio 2026",
      totalCents: 1800,
      lines: [
        {
          propertyName: "Bilocale Trastevere",
          cin: "IT058091A1B2C3D4E5",
          stayId: "s1",
          taxedNights: 2,
          amountCents: 1200,
        },
        // CIN assente (immobile senza CIN conforme) → colonna vuota.
        { propertyName: "Attico; centro", stayId: "s2", taxedNights: 1, amountCents: 600 },
      ],
    });
    const rows = csv.split("\r\n");
    expect(rows[0]).toBe("Comune;Roma");
    expect(rows[3]).toBe("Struttura;CIN;ID soggiorno;Notti tassate;Imposta (€)");
    expect(rows[4]).toBe("Bilocale Trastevere;IT058091A1B2C3D4E5;s1;2;12,00");
    expect(rows[5]).toBe('"Attico; centro";;s2;1;6,00'); // CIN vuoto + campo con ";" quotato
    expect(rows[6]).toBe("TOTALE;;;;18,00");
  });

  it("con servizio Norma applicato: aggiunge fee e netto comune in coda", () => {
    const csv = toDeclarationCsv({
      comuneName: "Roma",
      periodLabel: "Maggio 2026",
      totalCents: 1800,
      fee: { takeRateBps: 250, normaFeeCents: 45, comuneNetCents: 1755 },
      lines: [{ propertyName: "Bilocale", stayId: "s1", taxedNights: 3, amountCents: 1800 }],
    });
    const rows = csv.split("\r\n");
    expect(rows).toContain("Servizio Norma (2,5%);0,45");
    expect(rows).toContain("Netto da versare al comune;17,55");
  });

  it("senza fee: nessuna riga aggiuntiva (retrocompatibile)", () => {
    const csv = toDeclarationCsv({
      comuneName: "Roma",
      periodLabel: "Maggio 2026",
      totalCents: 600,
      lines: [{ propertyName: "Bilocale", stayId: "s1", taxedNights: 1, amountCents: 600 }],
    });
    expect(csv).not.toContain("Servizio Norma");
    expect(csv).not.toContain("Netto da versare");
  });
});
