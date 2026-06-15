import { describe, expect, it } from "vitest";
import {
  buildMovimentiXml,
  TracciatoXmlError,
  type ArrivoInput,
  type GiornoMovimento,
} from "../tracciato-xml";

function arrivo(over: Partial<ArrivoInput> = {}): ArrivoInput {
  return {
    idswh: "CK-001",
    tipoAlloggiato: "OSPITE_SINGOLO",
    cognome: "ROSSI",
    nome: "MARIO",
    sesso: "M",
    cittadinanzaCode: "100000100",
    statoResidenzaCode: "100000100",
    luogoResidenza: "403015146", // comune italiano
    dataNascita: "1972-06-11",
    statoNascitaCode: "100000100",
    comuneNascitaCode: "403015146",
    tipoTurismo: "ENOGASTRONOMICO",
    mezzoTrasporto: "AUTO",
    ...over,
  };
}

function giorno(over: Partial<GiornoMovimento> = {}): GiornoMovimento {
  return {
    data: "2026-05-01",
    struttura: { aperta: true, camereOccupate: 1, camereDisponibili: 16, lettiDisponibili: 34 },
    arrivi: [],
    partenze: [],
    ...over,
  };
}

describe("buildMovimentiXml — struttura base", () => {
  it("root <movimenti> con codice e prodotto, un <movimento> per giorno", () => {
    const xml = buildMovimentiXml({ codice: "A00927P", prodotto: "NORMA", giorni: [giorno()] });
    expect(xml).toContain("<codice>A00927P</codice>");
    expect(xml).toContain("<prodotto>NORMA</prodotto>");
    expect(xml).toContain("<data>20260501</data>"); // aaaammgg
    expect(xml).toContain("<apertura>SI</apertura>");
    expect(xml).toContain("<cameredisponibili>16</cameredisponibili>");
  });

  it("codice/prodotto mancanti → errore", () => {
    expect(() => buildMovimentiXml({ codice: "", prodotto: "NORMA", giorni: [] })).toThrow(
      TracciatoXmlError,
    );
  });

  it("ordina i movimenti per data crescente", () => {
    const xml = buildMovimentiXml({
      codice: "A1",
      prodotto: "NORMA",
      giorni: [giorno({ data: "2026-05-03" }), giorno({ data: "2026-05-01" })],
    });
    expect(xml.indexOf("20260501")).toBeLessThan(xml.indexOf("20260503"));
  });

  it("movimento ZERO: struttura presente, niente arrivi/partenze", () => {
    const xml = buildMovimentiXml({ codice: "A1", prodotto: "NORMA", giorni: [giorno()] });
    expect(xml).toContain("<struttura>");
    expect(xml).not.toContain("<arrivi>");
    expect(xml).not.toContain("<partenze>");
  });

  it("struttura chiusa → apertura NO e gli altri campi a zero", () => {
    const xml = buildMovimentiXml({
      codice: "A1",
      prodotto: "NORMA",
      giorni: [
        giorno({
          struttura: {
            aperta: false,
            camereOccupate: 5,
            camereDisponibili: 16,
            lettiDisponibili: 34,
          },
        }),
      ],
    });
    expect(xml).toContain("<apertura>NO</apertura>");
    expect(xml).toContain("<camereoccupate>0</camereoccupate>");
    expect(xml).toContain("<cameredisponibili>0</cameredisponibili>");
  });
});

describe("buildMovimentiXml — arrivo", () => {
  it("arrivo italiano completo con codici", () => {
    const xml = buildMovimentiXml({
      codice: "A1",
      prodotto: "NORMA",
      giorni: [giorno({ arrivi: [arrivo()] })],
    });
    expect(xml).toContain("<arrivi><arrivo>");
    expect(xml).toContain("<idswh>CK-001</idswh>");
    expect(xml).toContain("<tipoalloggiato>16</tipoalloggiato>");
    expect(xml).toContain("<statoresidenza>100000100</statoresidenza>");
    expect(xml).toContain("<luogoresidenza>403015146</luogoresidenza>");
    expect(xml).toContain("<datanascita>19720611</datanascita>");
    expect(xml).toContain("<comunenascita>403015146</comunenascita>");
    expect(xml).toContain("<tipoturismo>ENOGASTRONOMICO</tipoturismo>");
    expect(xml).toContain("<mezzotrasporto>AUTO</mezzotrasporto>");
  });

  it("ospite straniero: luogoresidenza stringa NUTS, niente comune di nascita", () => {
    const xml = buildMovimentiXml({
      codice: "A1",
      prodotto: "NORMA",
      giorni: [
        giorno({
          arrivi: [
            arrivo({
              cittadinanzaCode: "100000215",
              statoResidenzaCode: "100000215",
              luogoResidenza: "FR511",
              statoNascitaCode: "100000215",
              comuneNascitaCode: undefined,
            }),
          ],
        }),
      ],
    });
    expect(xml).toContain("<luogoresidenza>FR511</luogoresidenza>");
    expect(xml).toContain("<comunenascita></comunenascita>");
  });

  it("idcapo obbligatorio per familiare (19) e membro gruppo (20)", () => {
    expect(() =>
      buildMovimentiXml({
        codice: "A1",
        prodotto: "NORMA",
        giorni: [giorno({ arrivi: [arrivo({ tipoAlloggiato: "FAMILIARE", idCapo: undefined })] })],
      }),
    ).toThrow(/idcapo obbligatorio/);

    const ok = buildMovimentiXml({
      codice: "A1",
      prodotto: "NORMA",
      giorni: [giorno({ arrivi: [arrivo({ tipoAlloggiato: "FAMILIARE", idCapo: "CK-001" })] })],
    });
    expect(ok).toContain("<tipoalloggiato>19</tipoalloggiato>");
    expect(ok).toContain("<idcapo>CK-001</idcapo>");
  });

  it("comunenascita ammesso solo se nascita in Italia", () => {
    expect(() =>
      buildMovimentiXml({
        codice: "A1",
        prodotto: "NORMA",
        giorni: [
          giorno({
            arrivi: [arrivo({ statoNascitaCode: "100000215", comuneNascitaCode: "403015146" })],
          }),
        ],
      }),
    ).toThrow(/comunenascita ammesso solo/);
  });

  it("idswh oltre 20 char → errore; campi obbligatori mancanti → errore", () => {
    expect(() =>
      buildMovimentiXml({
        codice: "A1",
        prodotto: "NORMA",
        giorni: [giorno({ arrivi: [arrivo({ idswh: "X".repeat(21) })] })],
      }),
    ).toThrow(/idswh/);
    expect(() =>
      buildMovimentiXml({
        codice: "A1",
        prodotto: "NORMA",
        giorni: [giorno({ arrivi: [arrivo({ tipoTurismo: "" })] })],
      }),
    ).toThrow(/tipoturismo/);
  });

  it("data non valida → errore", () => {
    expect(() =>
      buildMovimentiXml({
        codice: "A1",
        prodotto: "NORMA",
        giorni: [giorno({ data: "2026-13-40" })],
      }),
    ).toThrow(TracciatoXmlError);
  });
});

describe("buildMovimentiXml — partenza", () => {
  it("partenza con idswh, tipo e data di arrivo per correlazione", () => {
    const xml = buildMovimentiXml({
      codice: "A1",
      prodotto: "NORMA",
      giorni: [
        giorno({
          data: "2026-05-04",
          partenze: [
            { idswh: "CK-001", tipoAlloggiato: "OSPITE_SINGOLO", dataArrivo: "2026-05-01" },
          ],
        }),
      ],
    });
    expect(xml).toContain("<partenze><partenza>");
    expect(xml).toContain("<idswh>CK-001</idswh>");
    expect(xml).toContain("<arrivo>20260501</arrivo>");
  });
});
