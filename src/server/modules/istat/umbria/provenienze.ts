// Tabella codici provenienze Turismatica/TOLM (Umbria), trascritta dal PDF ufficiale
// "NTO codici descrizione provenienze" (Regione Umbria). Provincia → sigla; estero → codice Turismatica.

/** Sigla provincia italiana (UPPERCASE) → nome provincia. Il CODICE provenienza È la sigla stessa. */
export const PROVINCIA_DESCRIZIONE: Record<string, string> = {
  AG: "AGRIGENTO",
  AL: "ALESSANDRIA",
  AN: "ANCONA",
  AO: "AOSTA",
  AR: "AREZZO",
  AP: "ASCOLI PICENO",
  AT: "ASTI",
  AV: "AVELLINO",
  BA: "BARI",
  BT: "BARLETTA-ANDRIA-TRANI",
  BL: "BELLUNO",
  BN: "BENEVENTO",
  BG: "BERGAMO",
  BI: "BIELLA",
  BO: "BOLOGNA",
  BZ: "BOLZANO",
  BS: "BRESCIA",
  BR: "BRINDISI",
  CA: "CAGLIARI",
  CL: "CALTANISSETTA",
  CB: "CAMPOBASSO",
  CI: "CARBONIA-IGLESIAS",
  CE: "CASERTA",
  CT: "CATANIA",
  CZ: "CATANZARO",
  CH: "CHIETI",
  CO: "COMO",
  CS: "COSENZA",
  CR: "CREMONA",
  KR: "CROTONE",
  CN: "CUNEO",
  EN: "ENNA",
  FM: "FERMO",
  FE: "FERRARA",
  FI: "FIRENZE",
  FG: "FOGGIA",
  FC: "FORLI'-CESENA",
  FR: "FROSINONE",
  GE: "GENOVA",
  GO: "GORIZIA",
  GR: "GROSSETO",
  IM: "IMPERIA",
  IS: "ISERNIA",
  SP: "LA SPEZIA",
  AQ: "L'AQUILA",
  LT: "LATINA",
  LE: "LECCE",
  LC: "LECCO",
  LI: "LIVORNO",
  LO: "LODI",
  LU: "LUCCA",
  MC: "MACERATA",
  MN: "MANTOVA",
  MS: "MASSA CARRARA",
  MT: "MATERA",
  VS: "MEDIO CAMPIDANO",
  ME: "MESSINA",
  MI: "MILANO",
  MO: "MODENA",
  MB: "MONZA E DELLA BRIANZA",
  NA: "NAPOLI",
  NO: "NOVARA",
  NU: "NUORO",
  OG: "OGLIASTRA",
  OT: "OLBIA-TEMPIO",
  OR: "ORISTANO",
  PD: "PADOVA",
  PA: "PALERMO",
  PR: "PARMA",
  PV: "PAVIA",
  PG: "PERUGIA",
  PU: "PESARO E URBINO",
  PE: "PESCARA",
  PC: "PIACENZA",
  PI: "PISA",
  PT: "PISTOIA",
  PN: "PORDENONE",
  PZ: "POTENZA",
  PO: "PRATO",
  RG: "RAGUSA",
  RA: "RAVENNA",
  RC: "REGGIO CALABRIA",
  RE: "REGGIO EMILIA",
  RI: "RIETI",
  RN: "RIMINI",
  RM: "ROMA",
  RO: "ROVIGO",
  SA: "SALERNO",
  SS: "SASSARI",
  SV: "SAVONA",
  SI: "SIENA",
  SR: "SIRACUSA",
  SO: "SONDRIO",
  TA: "TARANTO",
  TE: "TERAMO",
  TR: "TERNI",
  TO: "TORINO",
  TP: "TRAPANI",
  TN: "TRENTO",
  TV: "TREVISO",
  TS: "TRIESTE",
  UD: "UDINE",
  VA: "VARESE",
  VE: "VENEZIA",
  VB: "VERBANIA",
  VC: "VERCELLI",
  VR: "VERONA",
  VV: "VIBO VALENTIA",
  VI: "VICENZA",
  VT: "VITERBO",
};

/** Codice Turismatica estero → descrizione (nome stato o etichetta "ALTRI PAESI ..."). */
export const ESTERO_DESCRIZIONE: Record<string, string> = {
  "230": "ALTRI PAESI AFRICA MEDITERRANEA",
  "621": "ALTRI PAESI ASIA OCCIDENTALE",
  "521": "ALTRI PAESI CENTRO-SUD AMERICA",
  "300": "ALTRI PAESI DELL'AFRICA",
  "760": "ALTRI PAESI DELL'ASIA",
  "427": "ALTRI PAESI EUROPEI",
  "410": "ALTRI PAESI O TERRITORI NORD-AMERICANI",
  "810": "ALTRI PAESI O TERRITORI OCEANIA",
  "518": "ARGENTINA",
  "615": "AUSTRALIA",
  A: "AUSTRIA",
  B: "BELGIO",
  "515": "BRASILE",
  "068": "BULGARIA",
  "503": "CANADA",
  "720": "CINA",
  "600": "CIPRO",
  "728": "COREA DEL SUD",
  "992": "CROAZIA",
  DK: "DANIMARCA",
  "603": "EGITTO",
  "053": "ESTONIA",
  "209": "FINLANDIA",
  F: "FRANCIA",
  D: "GERMANIA",
  JAP: "GIAPPONE",
  GB: "GRAN BRETAGNA",
  "312": "GRECIA",
  "664": "INDIA",
  "121": "IRLANDA",
  "924": "ISLANDA",
  "612": "ISRAELE",
  "054": "LETTONIA",
  "055": "LITUANIA",
  L: "LUSSEMBURGO",
  "046": "MALTA",
  "509": "MESSICO",
  "777": "NON SPECIFICATO",
  N: "NORVEGIA",
  "804": "NUOVA ZELANDA",
  NL: "PAESI BASSI",
  "960": "POLONIA",
  "303": "PORTOGALLO",
  "961": "REPUBBLICA CECA",
  "066": "ROMANIA",
  "975": "RUSSIA",
  "963": "SLOVACCHIA",
  "991": "SLOVENIA",
  E: "SPAGNA",
  "606": "SUD AFRICA",
  S: "SVEZIA",
  CH: "SVIZZERA",
  "315": "TURCHIA",
  "072": "UCRAINA",
  "964": "UNGHERIA",
  USA: "US AMERICA",
  "512": "VENEZUELA",
};

/** Normalizza un nome paese per il confronto: UPPERCASE, senza accenti, trim, spazi singoli, via apostrofi → spazio. */
export function normalizzaNome(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritici
    .toUpperCase()
    .replace(/['’`´"().,/\-]/g, " ") // apostrofi/punteggiatura → spazio
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Nome paese NORMALIZZATO → codice Turismatica estero.
 * Chiavi = normalizzaNome(descrizione estero) + alias prudenti per le differenze
 * di denominazione note tra AlloggiatiWeb (Polizia) e Turismatica.
 */
export const ESTERO_CODICE_PER_NOME: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  // Una chiave per ogni descrizione estera normalizzata.
  for (const [code, descrizione] of Object.entries(ESTERO_DESCRIZIONE)) {
    map[normalizzaNome(descrizione)] = code;
  }
  // Alias prudenti (solo quelli certi).
  const alias: Record<string, string> = {
    "REGNO UNITO": "GB",
    "STATI UNITI": "USA",
    "STATI UNITI D AMERICA": "USA",
    "STATI UNITI DI AMERICA": "USA",
    "STATI UNITI AMERICA": "USA",
    OLANDA: "NL",
    GIAPPONE: "JAP",
    "REPUBBLICA DI COREA": "728",
    "COREA DEL SUD": "728",
    "FEDERAZIONE RUSSA": "975",
    RUSSIA: "975",
    CZECHIA: "961",
    "REPUBBLICA CECA": "961",
  };
  for (const [nome, code] of Object.entries(alias)) {
    map[normalizzaNome(nome)] = code;
  }
  return map;
})();

/** Provenienza per residente italiano: code = sigla provincia, descrizione = nome. null se sigla sconosciuta. */
export function provenienzaItalia(
  provinciaSigla: string,
): { code: string; descrizione: string } | null {
  const code = provinciaSigla.trim().toUpperCase();
  const descrizione = PROVINCIA_DESCRIZIONE[code];
  if (!descrizione) return null;
  return { code, descrizione };
}

/** Provenienza per residente estero: lookup per nome paese (normalizzato). null se non mappabile (mai inventare). */
export function provenienzaEstero(
  countryName: string,
): { code: string; descrizione: string } | null {
  const code = ESTERO_CODICE_PER_NOME[normalizzaNome(countryName)];
  if (!code) return null;
  return { code, descrizione: ESTERO_DESCRIZIONE[code] };
}

// VERIFICA: 110 province, 57 codici esteri
