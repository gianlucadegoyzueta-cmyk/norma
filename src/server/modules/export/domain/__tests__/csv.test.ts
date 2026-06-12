import { describe, expect, it } from "vitest";
import { guestsCsv, istatCsv, staysCsv, taxCsv, toCsv } from "../csv";

describe("toCsv", () => {
  it("intestazione + righe, separatore ; e CRLF", () => {
    const csv = toCsv(["A", "B"], [["1", "2"]]);
    expect(csv.split("\r\n")).toEqual(["A;B", "1;2"]);
  });
  it("quota i campi con separatore o virgolette (virgolette interne raddoppiate)", () => {
    expect(toCsv(["X"], [['ha; "virgolette"']])).toBe('X\r\n"ha; ""virgolette"""');
  });
});

describe("staysCsv", () => {
  it("serializza un soggiorno con date IT e origine", () => {
    const csv = staysCsv([
      {
        id: "s1",
        propertyName: "Casa Blu",
        comuneName: "Roma",
        provincia: "RM",
        arrivalDate: new Date("2026-05-01T10:00:00Z"),
        departureDate: new Date("2026-05-03T10:00:00Z"),
        guestsCount: 2,
        guestsAdded: 2,
        origin: "Airbnb",
      },
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "ID soggiorno;Struttura;Comune;Provincia;Arrivo;Partenza;Ospiti dichiarati;Ospiti inseriti;Origine",
    );
    expect(lines[1]).toBe("s1;Casa Blu;Roma;RM;01/05/2026;03/05/2026;2;2;Airbnb");
  });
  it("partenza assente → colonna vuota", () => {
    const csv = staysCsv([
      {
        id: "s2",
        propertyName: "X",
        comuneName: "Y",
        provincia: "RM",
        arrivalDate: new Date("2026-05-01T10:00:00Z"),
        departureDate: null,
        guestsCount: 1,
        guestsAdded: 0,
        origin: "Manuale",
      },
    ]);
    expect(csv.split("\r\n")[1]).toBe("s2;X;Y;RM;01/05/2026;;1;0;Manuale");
  });
});

describe("guestsCsv", () => {
  it("include solo campi anagrafici non sensibili", () => {
    const csv = guestsCsv([
      {
        stayId: "s1",
        lastName: "Rossi",
        firstName: "Mario",
        sex: "M",
        birthDate: new Date("1990-01-15T00:00:00Z"),
        birthCountry: "Italia",
        citizenship: "Italia",
        tipoAlloggiato: "OSPITE_SINGOLO",
        schedinaStatus: "ACQUIRED",
      },
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "ID soggiorno;Cognome;Nome;Sesso;Data di nascita;Stato di nascita;Cittadinanza;Tipo alloggiato;Stato schedina",
    );
    expect(lines[1]).toBe("s1;Rossi;Mario;M;15/01/1990;Italia;Italia;OSPITE_SINGOLO;ACQUIRED");
    expect(csv).not.toMatch(/documento|document/i);
  });
});

describe("taxCsv", () => {
  it("importo in euro con virgola", () => {
    const csv = taxCsv([
      {
        comuneName: "Roma",
        period: "2026-05",
        status: "SUBMITTED",
        propertyName: "Casa Blu",
        stayId: "s1",
        taxedNights: 4,
        amountCents: 1250,
      },
    ]);
    expect(csv.split("\r\n")[1]).toBe("Roma;2026-05;SUBMITTED;Casa Blu;s1;4;12,50");
  });
});

describe("istatCsv", () => {
  it("una riga per provenienza", () => {
    const csv = istatCsv([{ period: "2026-05", provenance: "Germania", arrivi: 1, presenze: 5 }]);
    expect(csv.split("\r\n")).toEqual([
      "Periodo;Provenienza;Arrivi;Presenze",
      "2026-05;Germania;1;5",
    ]);
  });
});
