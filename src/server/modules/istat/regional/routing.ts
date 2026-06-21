// Routing regionale del movimento turistico: data una struttura (→ sigla provincia del suo Comune),
// dice QUALE sistema regionale la copre e COSA può fare Norma oggi.
//
// Stato (onesto, mai promettere invii inesistenti):
//   FILE      → Norma genera il file (es. XML Ross1000) e l'operatore lo carica al portale regionale.
//   ASSISTITO → formato/portale non integrato: Norma fornisce i numeri (report CSV per-provenienza),
//               l'operatore li inserisce a mano sul portale.
//   AUTO      → trasmissione via web service (nessuna ancora implementata).
//
// Dati: ricerca 2026-06-14 (vedi docs/movimento-turistico-regioni.md) + ripartizione province→regioni.
// DA VERIFICARE col cliente/fonti ufficiali per le regioni a confidenza media/bassa (cluster B/C).
// Bolzano e Trento sono province autonome con sistemi DIVERSI → entry separate.

export type RegionalStatus = "AUTO" | "FILE" | "ASSISTITO";

/** Serializer di formato implementati in Norma. Aggiungere qui ogni nuovo tracciato regionale. */
export type RegionSerializerId = "ross1000-xml" | "spot-xml";

export interface RegionMovement {
  /** Id interno regione / provincia autonoma. */
  regionId: string;
  /** Nome leggibile (regione o PA). */
  label: string;
  /** Sistema regionale di rilevazione. */
  system: string;
  /** Serializer di formato implementato; null = nessuno → ASSISTITO. */
  serializerId: RegionSerializerId | null;
  status: RegionalStatus;
  note?: string;
}

const ross1000 = (
  regionId: string,
  label: string,
  system: string,
  note?: string,
): RegionMovement => ({
  regionId,
  label,
  system,
  serializerId: "ross1000-xml",
  status: "FILE",
  note,
});

const spotXml = (
  regionId: string,
  label: string,
  system: string,
  note?: string,
): RegionMovement => ({
  regionId,
  label,
  system,
  serializerId: "spot-xml",
  status: "FILE",
  note,
});

const assistito = (
  regionId: string,
  label: string,
  system: string,
  note?: string,
): RegionMovement => ({ regionId, label, system, serializerId: null, status: "ASSISTITO", note });

/** Mappa regionId → cosa può fare Norma. 19 regioni + 2 province autonome = 21 entry. */
export const REGION_MOVEMENT: Record<string, RegionMovement> = {
  // --- Cluster A: Ross1000 (XML) → FILE ---
  piemonte: ross1000("piemonte", "Piemonte", "Ross1000 (Piemonte Dati Turismo)"),
  lombardia: ross1000(
    "lombardia",
    "Lombardia",
    "Turismo5 (Ross1000 su ServiziRL)",
    "Payload Ross1000; web service per terzi non confermato → upload file.",
  ),
  liguria: ross1000(
    "liguria",
    "Liguria",
    "Ross1000 (extra-alberghiero) / RIMOVCLI (alberghiero)",
    "RIMOVCLI alberghiero ha un formato proprio: da integrare a parte.",
  ),
  veneto: ross1000("veneto", "Veneto", "Ross1000"),
  "emilia-romagna": ross1000("emilia-romagna", "Emilia-Romagna", "Ross1000 (ex Turismo5)"),
  toscana: ross1000(
    "toscana",
    "Toscana",
    "Ross1000 (FI/PO/PT) + portali provinciali",
    "Alcune province su portali diversi; transizione a Ross1000 annunciata. Verificare.",
  ),
  marche: ross1000("marche", "Marche", "Ross1000 (Istrice-Ross1000)"),
  lazio: ross1000("lazio", "Lazio", "Ross1000 (sostituisce RADAR dal 2025)"),
  abruzzo: ross1000("abruzzo", "Abruzzo", "SITRA (Ross1000)"),
  molise: ross1000("molise", "Molise", "Ross1000"),
  basilicata: ross1000("basilicata", "Basilicata", "SIST (Turismo5/Ross1000)"),
  calabria: ross1000("calabria", "Calabria", "Ross1000 (SIRDAT)"),
  sardegna: ross1000("sardegna", "Sardegna", "Ross1000 (ex SIRED)"),

  // --- Cluster B: formato file proprietario implementato → FILE ---
  puglia: spotXml(
    "puglia",
    "Puglia",
    "SPOT (InnovaPuglia)",
    "File XML SPOT generato da Norma; upload manuale dell'host sul portale.",
  ),

  // --- Cluster B/C: formato non ancora integrato → ASSISTITO (numeri pronti dal report CSV) ---
  "valle-aosta": assistito(
    "valle-aosta",
    "Valle d'Aosta",
    "VIT Albergatori",
    "Formato file da verificare.",
  ),
  "friuli-venezia-giulia": assistito(
    "friuli-venezia-giulia",
    "Friuli-Venezia Giulia",
    "WebTur",
    "Formato file da verificare.",
  ),
  trento: assistito(
    "trento",
    "PA Trento",
    "STU / Sistema PreSenze",
    "Provincia autonoma; non Ross1000.",
  ),
  bolzano: assistito(
    "bolzano",
    "PA Bolzano",
    "Rilevazione ASTAT (ecosistema LTS)",
    "Possibile certificazione software richiesta. Da verificare.",
  ),
  umbria: assistito("umbria", "Umbria", "Turismatica / TOLM", "File .txt C/59: serializer futuro."),
  campania: assistito(
    "campania",
    "Campania",
    "Sinfonia Turismo SMART",
    "Web API: candidata a canale AUTO futuro.",
  ),
  sicilia: assistito(
    "sicilia",
    "Sicilia",
    "Osservatorio Turistico Regionale",
    "Tracciato record (WebAPI): serializer futuro.",
  ),
};

/** Sigla provincia (maiuscola) → regionId. 107 province (province autonome BZ/TN separate). */
export const PROVINCIA_TO_REGIONE: Record<string, string> = {
  // Abruzzo
  AQ: "abruzzo",
  CH: "abruzzo",
  PE: "abruzzo",
  TE: "abruzzo",
  // Basilicata
  MT: "basilicata",
  PZ: "basilicata",
  // Calabria
  CZ: "calabria",
  CS: "calabria",
  KR: "calabria",
  RC: "calabria",
  VV: "calabria",
  // Campania
  AV: "campania",
  BN: "campania",
  CE: "campania",
  NA: "campania",
  SA: "campania",
  // Emilia-Romagna
  BO: "emilia-romagna",
  FE: "emilia-romagna",
  FC: "emilia-romagna",
  MO: "emilia-romagna",
  PR: "emilia-romagna",
  PC: "emilia-romagna",
  RA: "emilia-romagna",
  RE: "emilia-romagna",
  RN: "emilia-romagna",
  // Friuli-Venezia Giulia
  GO: "friuli-venezia-giulia",
  PN: "friuli-venezia-giulia",
  TS: "friuli-venezia-giulia",
  UD: "friuli-venezia-giulia",
  // Lazio
  FR: "lazio",
  LT: "lazio",
  RI: "lazio",
  RM: "lazio",
  VT: "lazio",
  // Liguria
  GE: "liguria",
  IM: "liguria",
  SP: "liguria",
  SV: "liguria",
  // Lombardia
  BG: "lombardia",
  BS: "lombardia",
  CO: "lombardia",
  CR: "lombardia",
  LC: "lombardia",
  LO: "lombardia",
  MN: "lombardia",
  MI: "lombardia",
  MB: "lombardia",
  PV: "lombardia",
  SO: "lombardia",
  VA: "lombardia",
  // Marche
  AN: "marche",
  AP: "marche",
  FM: "marche",
  MC: "marche",
  PU: "marche",
  // Molise
  CB: "molise",
  IS: "molise",
  // Piemonte
  AL: "piemonte",
  AT: "piemonte",
  BI: "piemonte",
  CN: "piemonte",
  NO: "piemonte",
  TO: "piemonte",
  VB: "piemonte",
  VC: "piemonte",
  // Puglia
  BA: "puglia",
  BT: "puglia",
  BR: "puglia",
  FG: "puglia",
  LE: "puglia",
  TA: "puglia",
  // Sardegna
  CA: "sardegna",
  NU: "sardegna",
  OR: "sardegna",
  SS: "sardegna",
  SU: "sardegna",
  // Sicilia
  AG: "sicilia",
  CL: "sicilia",
  CT: "sicilia",
  EN: "sicilia",
  ME: "sicilia",
  PA: "sicilia",
  RG: "sicilia",
  SR: "sicilia",
  TP: "sicilia",
  // Toscana
  AR: "toscana",
  FI: "toscana",
  GR: "toscana",
  LI: "toscana",
  LU: "toscana",
  MS: "toscana",
  PI: "toscana",
  PT: "toscana",
  PO: "toscana",
  SI: "toscana",
  // Trentino-Alto Adige (province autonome separate)
  BZ: "bolzano",
  TN: "trento",
  // Umbria
  PG: "umbria",
  TR: "umbria",
  // Valle d'Aosta
  AO: "valle-aosta",
  // Veneto
  BL: "veneto",
  PD: "veneto",
  RO: "veneto",
  TV: "veneto",
  VE: "veneto",
  VR: "veneto",
  VI: "veneto",
};

/** Risolve il routing del movimento dalla sigla provincia del Comune. null se sigla sconosciuta. */
export function regionMovementForProvincia(
  provinciaSigla: string | null | undefined,
): RegionMovement | null {
  if (!provinciaSigla) return null;
  const regionId = PROVINCIA_TO_REGIONE[provinciaSigla.trim().toUpperCase()];
  return regionId ? (REGION_MOVEMENT[regionId] ?? null) : null;
}
