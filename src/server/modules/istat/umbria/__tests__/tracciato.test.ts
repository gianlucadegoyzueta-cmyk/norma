import { describe, expect, it } from "vitest";
import { buildC59Giorno, filenameC59, UmbriaC59Error, type UmbriaGiornoFile } from "../tracciato";

// Dati allineati all'esempio reale TOLM (09-07-2015): prec 27, arrivi 8, totale 35, partiti 23,
// presenti 12, camere 9. Il serializer DEVE riprodurre le righe dell'esempio carattere per carattere.
function giorno(over: Partial<UmbriaGiornoFile> = {}): UmbriaGiornoFile {
  return {
    denominazione: "Denominazione struttura",
    data: "2015-07-09",
    presentiNottePrecedente: 27,
    arrivati: 8,
    partiti: 23,
    camereOccupate: 9,
    provenienze: [
      { code: "515", descrizione: "BRASILE", arrivati: 0, partiti: 8 },
      { code: "BL", descrizione: "BELLUNO", arrivati: 0, partiti: 1 },
    ],
    ...over,
  };
}

const lines = (s: string) => s.split("\r\n");

describe("buildC59Giorno — layout fixed-width (validato sull'esempio reale)", () => {
  it("usa CRLF e termina con CRLF", () => {
    const out = buildC59Giorno(giorno());
    expect(out.endsWith("\r\n")).toBe(true);
    expect(out).toContain("\r\n");
  });

  it("R1 denominazione riempita a 255 caratteri", () => {
    const l = lines(buildC59Giorno(giorno()));
    expect(l[0]).toHaveLength(255);
    expect(l[0].startsWith("Denominazione struttura")).toBe(true);
  });

  it("R3-R7 valori a colonna 28; Totale e Presenti notte derivati", () => {
    const l = lines(buildC59Giorno(giorno()));
    expect(l[2]).toBe("Presenti notte precedente  27"); // 25+2 spazi, valore a col 28
    expect(l[3]).toBe("Arrivati".padEnd(27) + "8");
    expect(l[4]).toBe("Totale".padEnd(27) + "35"); // 27 + 8
    expect(l[5]).toBe("Partiti".padEnd(27) + "23");
    expect(l[6]).toBe("Presenti nella notte".padEnd(27) + "12"); // 35 − 23
  });

  it("R8 camere occupate a col 17; R9 data dd-mm-yyyy a col 31", () => {
    const l = lines(buildC59Giorno(giorno()));
    expect(l[7]).toBe("CAMERE OCCUPATE=9");
    expect(l[8]).toBe("ARRIVATI E PARTITI DEL GIORNO 09-07-2015");
    expect(l[8].slice(30)).toBe("09-07-2015"); // data a colonna 31 (index 30)
  });

  it("header e righe provenienza con separatori e allineamento esatti", () => {
    const l = lines(buildC59Giorno(giorno()));
    expect(l[10]).toBe("PROVENIENZA".padEnd(41) + "|ARR. |PAR. |");
    // riga provenienza identica all'esempio reale
    expect(l[11]).toBe("515  |BRASILE                            |    0|    8|");
    // separatori | alle colonne 6,42,48,54 (index 5,41,47,53)
    const r = l[11];
    expect([5, 41, 47, 53].every((i) => r[i] === "|")).toBe(true);
    expect(l[12]).toBe("BL   |BELLUNO                            |    0|    1|");
  });

  it("filenameC59 → ggmmaaaa.txt", () => {
    expect(filenameC59("2015-07-09")).toBe("09072015.txt");
  });
});

describe("buildC59Giorno — validazioni", () => {
  it("partiti > totale presenti → errore di coerenza", () => {
    expect(() =>
      buildC59Giorno(giorno({ presentiNottePrecedente: 0, arrivati: 1, partiti: 5 })),
    ).toThrow(/Incoerenza/);
  });

  it("valori negativi → errore", () => {
    expect(() => buildC59Giorno(giorno({ camereOccupate: -1 }))).toThrow(UmbriaC59Error);
  });

  it("data non valida → errore", () => {
    expect(() => buildC59Giorno(giorno({ data: "2015-13-40" }))).toThrow(UmbriaC59Error);
  });

  it("codice provenienza troppo lungo → errore", () => {
    expect(() =>
      buildC59Giorno(
        giorno({ provenienze: [{ code: "TROPPO", descrizione: "X", arrivati: 0, partiti: 0 }] }),
      ),
    ).toThrow(/Codice provenienza/);
  });
});
