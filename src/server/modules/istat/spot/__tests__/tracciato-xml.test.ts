import { describe, expect, it } from "vitest";
import { buildSpotXml, SpotXmlError, type SpotArrivo, type SpotGiorno } from "../tracciato-xml";

function arrivo(over: Partial<SpotArrivo> = {}): SpotArrivo {
  return {
    codiceClienteSr: "CK-001",
    sesso: "M",
    cittadinanzaCode: "100000100",
    residenza: { comuneResidenzaCode: "412058091" },
    occupaPostoLetto: true,
    dayUse: false,
    tipologia: "OSPITE_SINGOLO",
    eta: 71,
    ...over,
  };
}

function giornoMP(over: Partial<SpotGiorno> = {}): SpotGiorno {
  return {
    data: "2026-05-01",
    stato: "MP",
    arrivi: [arrivo()],
    partenze: [],
    datiStruttura: { camereDisponibili: 1, postiLettoDisponibili: 2, camereOccupate: 1 },
    ...over,
  };
}

describe("buildSpotXml — radice e struttura", () => {
  it("radice <movimenti> con vendor e schema location", () => {
    const xml = buildSpotXml({ vendor: "NORMA", giorni: [giornoMP()] });
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('xsi:noNamespaceSchemaLocation="movimentogiornaliero-0.5.xsd"');
    expect(xml).toContain('vendor="NORMA"');
  });

  it("vendor mancante → errore", () => {
    expect(() => buildSpotXml({ vendor: "", giorni: [] })).toThrow(SpotXmlError);
  });

  it("ordina i movimenti per data crescente", () => {
    const xml = buildSpotXml({
      vendor: "NORMA",
      giorni: [giornoMP({ data: "2026-05-03" }), giornoMP({ data: "2026-05-01" })],
    });
    expect(xml.indexOf('data="2026-05-01"')).toBeLessThan(xml.indexOf('data="2026-05-03"'));
  });

  it("data non valida → errore", () => {
    expect(() =>
      buildSpotXml({ vendor: "NORMA", giorni: [giornoMP({ data: "2026-13-40" })] }),
    ).toThrow(SpotXmlError);
  });
});

describe("buildSpotXml — stati MP/NM/EC", () => {
  it("NM: movimento vuoto autochiuso, niente figli", () => {
    const xml = buildSpotXml({
      vendor: "NORMA",
      giorni: [{ data: "2026-05-01", stato: "NM" }],
    });
    expect(xml).toContain('<movimento type="NM" data="2026-05-01"/>');
    expect(xml).not.toContain("<arrivi>");
    expect(xml).not.toContain("<datistruttura>");
  });

  it("EC: esercizio chiuso, movimento vuoto autochiuso", () => {
    const xml = buildSpotXml({ vendor: "NORMA", giorni: [{ data: "2026-05-01", stato: "EC" }] });
    expect(xml).toContain('<movimento type="EC" data="2026-05-01"/>');
  });

  it("NM/EC con figli → errore", () => {
    expect(() =>
      buildSpotXml({
        vendor: "NORMA",
        giorni: [{ data: "2026-05-01", stato: "NM", arrivi: [arrivo()] }],
      }),
    ).toThrow(/non sono ammessi/);
  });

  it("MP senza arrivi né partenze → errore (regola 13)", () => {
    expect(() =>
      buildSpotXml({ vendor: "NORMA", giorni: [giornoMP({ arrivi: [], partenze: [] })] }),
    ).toThrow(/almeno un arrivo o una partenza/);
  });

  it("MP senza datistruttura → errore", () => {
    expect(() =>
      buildSpotXml({ vendor: "NORMA", giorni: [giornoMP({ datiStruttura: undefined })] }),
    ).toThrow(/datistruttura/);
  });
});

describe("buildSpotXml — arrivo", () => {
  it("ospite singolo italiano completo, ordine campi", () => {
    const xml = buildSpotXml({ vendor: "NORMA", giorni: [giornoMP()] });
    expect(xml).toContain(
      "<arrivo>" +
        "<codiceclientesr>CK-001</codiceclientesr>" +
        "<sesso>M</sesso>" +
        "<cittadinanza>100000100</cittadinanza>" +
        "<comuneresidenza>412058091</comuneresidenza>" +
        "<occupazionepostoletto>si</occupazionepostoletto>" +
        "<dayuse>no</dayuse>" +
        "<tipologiaalloggiato>16</tipologiaalloggiato>" +
        "<eta>71</eta>" +
        "</arrivo>",
    );
  });

  it("ospite straniero: paeseresidenza al posto di comuneresidenza", () => {
    const xml = buildSpotXml({
      vendor: "NORMA",
      giorni: [
        giornoMP({
          arrivi: [
            arrivo({
              cittadinanzaCode: "100000536",
              residenza: { paeseResidenzaCode: "100000536" },
            }),
          ],
        }),
      ],
    });
    expect(xml).toContain("<paeseresidenza>100000536</paeseresidenza>");
    expect(xml).not.toContain("<comuneresidenza>");
  });

  it("residenza con entrambi o nessuno → errore", () => {
    expect(() =>
      buildSpotXml({
        vendor: "NORMA",
        giorni: [giornoMP({ arrivi: [arrivo({ residenza: {} })] })],
      }),
    ).toThrow(/ESATTAMENTE uno/);
    expect(() =>
      buildSpotXml({
        vendor: "NORMA",
        giorni: [
          giornoMP({
            arrivi: [
              arrivo({
                residenza: { comuneResidenzaCode: "412058091", paeseResidenzaCode: "100000536" },
              }),
            ],
          }),
        ],
      }),
    ).toThrow(/ESATTAMENTE uno/);
  });

  it("dayuse e occupazionepostoletto come si/no", () => {
    const xml = buildSpotXml({
      vendor: "NORMA",
      giorni: [giornoMP({ arrivi: [arrivo({ dayUse: true, occupaPostoLetto: false })] })],
    });
    expect(xml).toContain("<dayuse>si</dayuse>");
    expect(xml).toContain("<occupazionepostoletto>no</occupazionepostoletto>");
  });

  it("tipologia 19/20 a livello arrivo → errore", () => {
    expect(() =>
      buildSpotXml({
        vendor: "NORMA",
        giorni: [giornoMP({ arrivi: [arrivo({ tipologia: "FAMILIARE" })] })],
      }),
    ).toThrow(/non ammessa a livello/);
  });
});

describe("buildSpotXml — componenti (famiglia/gruppo)", () => {
  it("capofamiglia (17) con componenti annidati", () => {
    const xml = buildSpotXml({
      vendor: "NORMA",
      giorni: [
        giornoMP({
          arrivi: [
            arrivo({
              tipologia: "CAPO_FAMIGLIA",
              componenti: [
                {
                  codiceClienteSr: "CK-002",
                  sesso: "F",
                  cittadinanzaCode: "100000536",
                  residenza: { paeseResidenzaCode: "100000536" },
                  occupaPostoLetto: true,
                  eta: 42,
                },
              ],
            }),
          ],
        }),
      ],
    });
    expect(xml).toContain("<tipologiaalloggiato>17</tipologiaalloggiato>");
    expect(xml).toContain("<componenti><componente>");
    expect(xml).toContain("<codiceclientesr>CK-002</codiceclientesr>");
    // il componente NON ha dayuse né tipologiaalloggiato
    expect(xml).toContain(
      "<componente>" +
        "<codiceclientesr>CK-002</codiceclientesr>" +
        "<sesso>F</sesso>" +
        "<cittadinanza>100000536</cittadinanza>" +
        "<paeseresidenza>100000536</paeseresidenza>" +
        "<occupazionepostoletto>si</occupazionepostoletto>" +
        "<eta>42</eta>" +
        "</componente>",
    );
  });

  it("capo senza componenti → errore (regola 14)", () => {
    expect(() =>
      buildSpotXml({
        vendor: "NORMA",
        giorni: [giornoMP({ arrivi: [arrivo({ tipologia: "CAPO_GRUPPO", componenti: [] })] })],
      }),
    ).toThrow(/componenti.*obbligatorio/);
  });

  it("ospite singolo con componenti → errore (regola 14)", () => {
    expect(() =>
      buildSpotXml({
        vendor: "NORMA",
        giorni: [
          giornoMP({
            arrivi: [
              arrivo({
                componenti: [
                  {
                    codiceClienteSr: "CK-002",
                    sesso: "F",
                    cittadinanzaCode: "100000100",
                    residenza: { comuneResidenzaCode: "412058091" },
                    occupaPostoLetto: true,
                    eta: 8,
                  },
                ],
              }),
            ],
          }),
        ],
      }),
    ).toThrow(/non è ammesso/);
  });
});

describe("buildSpotXml — partenze e datistruttura", () => {
  it("partenze come lista di codiceclientesr", () => {
    const xml = buildSpotXml({
      vendor: "NORMA",
      giorni: [giornoMP({ arrivi: [], partenze: ["CK-001", "CK-002"] })],
    });
    expect(xml).toContain(
      "<partenze><codiceclientesr>CK-001</codiceclientesr><codiceclientesr>CK-002</codiceclientesr></partenze>",
    );
  });

  it("datistruttura nell'ordine cameredisponibili/postiletto/camereoccupate", () => {
    const xml = buildSpotXml({ vendor: "NORMA", giorni: [giornoMP()] });
    expect(xml).toContain(
      "<datistruttura>" +
        "<cameredisponibili>1</cameredisponibili>" +
        "<postilettodisponibili>2</postilettodisponibili>" +
        "<camereoccupate>1</camereoccupate>" +
        "</datistruttura>",
    );
  });

  it("camereoccupate > cameredisponibili → errore (regola 17)", () => {
    expect(() =>
      buildSpotXml({
        vendor: "NORMA",
        giorni: [
          giornoMP({
            datiStruttura: { camereDisponibili: 1, postiLettoDisponibili: 4, camereOccupate: 2 },
          }),
        ],
      }),
    ).toThrow(/regola 17/);
  });

  it("cameredisponibili > postilettodisponibili → errore (regola 18)", () => {
    expect(() =>
      buildSpotXml({
        vendor: "NORMA",
        giorni: [
          giornoMP({
            datiStruttura: { camereDisponibili: 3, postiLettoDisponibili: 2, camereOccupate: 1 },
          }),
        ],
      }),
    ).toThrow(/regola 18/);
  });
});
