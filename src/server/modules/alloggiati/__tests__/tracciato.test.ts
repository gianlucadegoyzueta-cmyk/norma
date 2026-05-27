import { describe, expect, it } from "vitest";
import {
  FIELD_LAYOUT,
  TRACCIATO_FILE_UNICO_LEN,
  TRACCIATO_LEN,
  TracciatoError,
  type TracciatoInput,
  buildTracciatoRecord,
  toISODateUTC,
} from "../domain/tracciato";

// Estrae un campo dal record usando il layout ufficiale (così i test verificano la POSIZIONE).
function field(record: string, name: keyof typeof FIELD_LAYOUT): string {
  const { start, len } = FIELD_LAYOUT[name];
  return record.slice(start, start + len);
}

// Ospite singolo italiano, con documento (caso completo).
const base: TracciatoInput = {
  tipoAlloggiato: "OSPITE_SINGOLO",
  dataArrivo: "2026-06-01",
  giorniPermanenza: 3,
  cognome: "Rossi",
  nome: "Mario",
  sesso: "M",
  dataNascita: "1990-05-20",
  statoNascitaCode: "100000100", // 9
  cittadinanzaCode: "100000100", // 9
  comuneNascitaCode: "058091001", // 9 (Italia)
  provinciaNascita: "RM", // 2
  tipoDocumentoCode: "IDELE", // 5
  numeroDocumento: "AB1234567", // <=20
  luogoRilascioCode: "058091001", // 9
};

describe("buildTracciatoRecord — record standard (168)", () => {
  const rec = buildTracciatoRecord(base);

  it("ha lunghezza esatta 168", () => {
    expect(rec).toHaveLength(TRACCIATO_LEN);
  });

  it("posiziona ogni campo correttamente (ospite singolo italiano)", () => {
    expect(field(rec, "tipoAlloggiato")).toBe("16");
    expect(field(rec, "dataArrivo")).toBe("01/06/2026");
    expect(field(rec, "giorniPermanenza")).toBe("03");
    expect(field(rec, "cognome")).toBe("Rossi".padEnd(50, " "));
    expect(field(rec, "nome")).toBe("Mario".padEnd(30, " "));
    expect(field(rec, "sesso")).toBe("1");
    expect(field(rec, "dataNascita")).toBe("20/05/1990");
    expect(field(rec, "comuneNascita")).toBe("058091001");
    expect(field(rec, "provinciaNascita")).toBe("RM");
    expect(field(rec, "statoNascita")).toBe("100000100");
    expect(field(rec, "cittadinanza")).toBe("100000100");
    expect(field(rec, "tipoDocumento")).toBe("IDELE");
    expect(field(rec, "numeroDocumento")).toBe("AB1234567".padEnd(20, " "));
    expect(field(rec, "luogoRilascioDocumento")).toBe("058091001");
  });

  it("nessun campo si sovrappone: la concatenazione dei campi 0..167 ricompone la riga", () => {
    const order: (keyof typeof FIELD_LAYOUT)[] = [
      "tipoAlloggiato", "dataArrivo", "giorniPermanenza", "cognome", "nome", "sesso",
      "dataNascita", "comuneNascita", "provinciaNascita", "statoNascita", "cittadinanza",
      "tipoDocumento", "numeroDocumento", "luogoRilascioDocumento",
    ];
    expect(order.map((f) => field(rec, f)).join("")).toBe(rec);
  });

  it("sesso F → 2; giorni con zero-padding (30 → '30')", () => {
    const r = buildTracciatoRecord({ ...base, sesso: "F", giorniPermanenza: 30 });
    expect(field(r, "sesso")).toBe("2");
    expect(field(r, "giorniPermanenza")).toBe("30");
  });
});

describe("regole sul documento (16/17/18 vs 19/20)", () => {
  it("CAPO_FAMIGLIA (17): documento valorizzato", () => {
    const r = buildTracciatoRecord({ ...base, tipoAlloggiato: "CAPO_FAMIGLIA" });
    expect(field(r, "tipoAlloggiato")).toBe("17");
    expect(field(r, "tipoDocumento")).toBe("IDELE");
    expect(field(r, "numeroDocumento")).toBe("AB1234567".padEnd(20, " "));
  });

  it("FAMILIARE (19): campi documento in BIANCO anche se forniti in input", () => {
    const r = buildTracciatoRecord({ ...base, tipoAlloggiato: "FAMILIARE" });
    expect(r).toHaveLength(TRACCIATO_LEN);
    expect(field(r, "tipoAlloggiato")).toBe("19");
    expect(field(r, "tipoDocumento")).toBe(" ".repeat(5));
    expect(field(r, "numeroDocumento")).toBe(" ".repeat(20));
    expect(field(r, "luogoRilascioDocumento")).toBe(" ".repeat(9));
    // gli altri campi restano valorizzati
    expect(field(r, "cognome")).toBe("Rossi".padEnd(50, " "));
    expect(field(r, "statoNascita")).toBe("100000100");
  });

  it("MEMBRO_GRUPPO (20): documento in bianco; funziona anche senza dati documento in input", () => {
    const r = buildTracciatoRecord({
      ...base,
      tipoAlloggiato: "MEMBRO_GRUPPO",
      tipoDocumentoCode: undefined,
      numeroDocumento: undefined,
      luogoRilascioCode: undefined,
    });
    expect(field(r, "tipoAlloggiato")).toBe("20");
    expect(field(r, "tipoDocumento")).toBe(" ".repeat(5));
  });

  it("16/17/18 senza documento → errore", () => {
    expect(() => buildTracciatoRecord({ ...base, tipoDocumentoCode: undefined })).toThrow(TracciatoError);
    expect(() => buildTracciatoRecord({ ...base, numeroDocumento: undefined })).toThrow(TracciatoError);
    expect(() => buildTracciatoRecord({ ...base, luogoRilascioCode: undefined })).toThrow(TracciatoError);
  });
});

describe("italiano vs straniero (comune/provincia)", () => {
  it("straniero: comune e provincia in BIANCO, stato valorizzato", () => {
    const r = buildTracciatoRecord({
      ...base,
      comuneNascitaCode: undefined,
      provinciaNascita: undefined,
      statoNascitaCode: "200000200", // stato estero
      luogoRilascioCode: "200000200", // per stranieri il luogo è lo Stato
    });
    expect(r).toHaveLength(TRACCIATO_LEN);
    expect(field(r, "comuneNascita")).toBe(" ".repeat(9));
    expect(field(r, "provinciaNascita")).toBe(" ".repeat(2));
    expect(field(r, "statoNascita")).toBe("200000200");
    expect(field(r, "luogoRilascioDocumento")).toBe("200000200");
  });

  it("incoerenza comune/provincia (uno solo presente) → errore", () => {
    expect(() => buildTracciatoRecord({ ...base, provinciaNascita: undefined })).toThrow(TracciatoError);
    expect(() => buildTracciatoRecord({ ...base, comuneNascitaCode: undefined })).toThrow(TracciatoError);
  });
});

describe("file unico (174)", () => {
  it("aggiunge ID Appartamento (zero-pad a 6) e arriva a 174", () => {
    const r = buildTracciatoRecord(base, { idAppartamento: 4 });
    expect(r).toHaveLength(TRACCIATO_FILE_UNICO_LEN);
    expect(field(r, "idAppartamento")).toBe("000004");
    // i primi 168 caratteri restano identici al record standard
    expect(r.slice(0, TRACCIATO_LEN)).toBe(buildTracciatoRecord(base));
  });

  it("ID Appartamento troppo grande (>6 cifre) → errore", () => {
    expect(() => buildTracciatoRecord(base, { idAppartamento: 1234567 })).toThrow(TracciatoError);
  });
});

describe("validazioni dei campi", () => {
  it("giorni fuori range (0, 31) → errore", () => {
    expect(() => buildTracciatoRecord({ ...base, giorniPermanenza: 0 })).toThrow(TracciatoError);
    expect(() => buildTracciatoRecord({ ...base, giorniPermanenza: 31 })).toThrow(TracciatoError);
  });

  it("data in formato sbagliato → errore", () => {
    expect(() => buildTracciatoRecord({ ...base, dataArrivo: "01-06-2026" })).toThrow(TracciatoError);
    expect(() => buildTracciatoRecord({ ...base, dataNascita: "1990/05/20" })).toThrow(TracciatoError);
  });

  it("codice di lunghezza errata → errore (protezione contro tabelle mal popolate)", () => {
    expect(() => buildTracciatoRecord({ ...base, statoNascitaCode: "12345678" })).toThrow(TracciatoError); // 8 invece di 9
    expect(() => buildTracciatoRecord({ ...base, provinciaNascita: "ROMA" })).toThrow(TracciatoError); // 4 invece di 2
  });

  it("sesso non valido → errore", () => {
    expect(() => buildTracciatoRecord({ ...base, sesso: "X" as never })).toThrow(TracciatoError);
  });

  it("cognome più lungo di 50 → troncato a 50", () => {
    const lungo = "A".repeat(60);
    const r = buildTracciatoRecord({ ...base, cognome: lungo });
    expect(field(r, "cognome")).toBe("A".repeat(50));
    expect(r).toHaveLength(TRACCIATO_LEN);
  });
});

describe("toISODateUTC", () => {
  it("estrae la data ISO in UTC", () => {
    expect(toISODateUTC(new Date("1990-05-20T00:00:00.000Z"))).toBe("1990-05-20");
    expect(toISODateUTC(new Date("2026-06-01T15:30:00.000Z"))).toBe("2026-06-01");
  });
});
