// Serializzazione del TRACCIATO XML Ross1000 (movimento turistico ISTAT). PURA: input tipizzato → stringa.
//
// Fonte: "Tracciato Record di Integrazione Dati (XML)" GIES v3, 18/03/2026 (docs/ross1000-movimento-turistico.md).
// Differenza con Alloggiati: qui si comunicano ARRIVI + PARTENZE + presenze + camere, su base mensile.
// I codici (tipo alloggiato, cittadinanza, stato/comune) usano le STESSE tabelle Polizia di Stato del
// modulo alloggiati — qui però restano semplici stringhe-codice già risolte (il resolver è a monte).
//
// Questo modulo NON dipende da `alloggiati`: ridichiara solo le costanti ufficiali condivise, con nota.

import type { Sex, TipoAlloggiato } from "@prisma/client";

/** Codice Nazioni per l'Italia (tabella Polizia). Discrimina i campi "solo se Italia". */
export const ITALIA_CODE = "100000100";

/**
 * Codici Tipi_Alloggiato (tabella Polizia, identici a quelli usati da Alloggiati).
 * 16 singolo, 17 capofamiglia, 18 capogruppo, 19 familiare, 20 membro gruppo.
 */
export const TIPO_ALLOGGIATO_CODE: Record<TipoAlloggiato, string> = {
  OSPITE_SINGOLO: "16",
  CAPO_FAMIGLIA: "17",
  CAPO_GRUPPO: "18",
  FAMILIARE: "19",
  MEMBRO_GRUPPO: "20",
};

/** Tipi che sono "al seguito" di un capo (19/20): per loro `idcapo` è obbligatorio. */
const TIPI_AL_SEGUITO = new Set<TipoAlloggiato>(["FAMILIARE", "MEMBRO_GRUPPO"]);

const SEX_CODE: Record<Sex, string> = { M: "M", F: "F" };

export class TracciatoXmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TracciatoXmlError";
  }
}

// ----------------------------- tipi di input (già risolti) -----------------------------

/** Stato giornaliero della struttura (sempre presente in ogni movimento). */
export interface StrutturaGiorno {
  aperta: boolean;
  camereOccupate: number;
  camereDisponibili: number;
  lettiDisponibili: number;
}

/** Un check-in (arrivo) di un ospite in un dato giorno. */
export interface ArrivoInput {
  idswh: string; // max 20, univoco e stabile
  tipoAlloggiato: TipoAlloggiato;
  idCapo?: string; // obbligatorio se 19/20
  cognome?: string; // max 50
  nome?: string; // max 30
  sesso: Sex;
  cittadinanzaCode: string;
  statoResidenzaCode: string;
  /** Se residenza Italia → codice Comune; estero → NUTS o stringa (max 30). */
  luogoResidenza: string;
  dataNascita: string; // ISO YYYY-MM-DD
  statoNascitaCode?: string;
  comuneNascitaCode?: string; // solo se statoNascita = Italia
  tipoTurismo: string; // obbligatorio
  mezzoTrasporto: string; // obbligatorio
  canalePrenotazione?: string;
  titoloStudio?: string;
  professione?: string;
  esenzioneImposta?: string;
}

/** Un check-out (partenza) di un ospite in un dato giorno. */
export interface PartenzaInput {
  idswh: string;
  tipoAlloggiato: TipoAlloggiato;
  dataArrivo: string; // ISO YYYY-MM-DD (per correlare al check-in)
}

/** Un giorno di attività della struttura. */
export interface GiornoMovimento {
  data: string; // ISO YYYY-MM-DD
  struttura: StrutturaGiorno;
  arrivi: ArrivoInput[];
  partenze: PartenzaInput[];
}

/** Il file completo: codice struttura + gestionale + giorni in ordine. */
export interface MovimentiInput {
  /** Codice struttura assegnato dall'ente di raccolta (obbligatorio). */
  codice: string;
  /** Nome del gestionale che produce il file. */
  prodotto: string;
  giorni: GiornoMovimento[];
}

// ----------------------------- helper puri -----------------------------

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** ISO "YYYY-MM-DD" → "aaaammgg" (8 cifre), con validazione minima. */
function toAaaaMmGg(iso: string, name: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) {
    throw new TracciatoXmlError(
      `Campo "${name}" non valido: atteso ISO YYYY-MM-DD, ricevuto "${iso}".`,
    );
  }
  const [, y, mm, dd] = m;
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) {
    throw new TracciatoXmlError(`Campo "${name}" non è una data valida: "${iso}".`);
  }
  return `${y}${mm}${dd}`;
}

function requireNonEmpty(value: string | undefined, name: string): string {
  if (!value || value.trim() === "") {
    throw new TracciatoXmlError(`Campo "${name}" obbligatorio mancante.`);
  }
  return value;
}

function requireMaxLen(value: string, max: number, name: string): string {
  if (value.length > max) {
    throw new TracciatoXmlError(
      `Campo "${name}" troppo lungo: max ${max}, ricevuti ${value.length}.`,
    );
  }
  return value;
}

function nonNegInt(value: number, name: string): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new TracciatoXmlError(`Campo "${name}" non valido: ${value} (atteso intero ≥ 0).`);
  }
  return String(value);
}

/** Elemento XML semplice; salta il tag se il valore è undefined/"" e `optional`. */
function tag(name: string, value: string | undefined, opts: { optional?: boolean } = {}): string {
  if (value === undefined || value === "") {
    if (opts.optional) return `<${name}></${name}>`; // il tracciato mostra i facoltativi anche vuoti
    return `<${name}></${name}>`;
  }
  return `<${name}>${escapeXml(value)}</${name}>`;
}

// ----------------------------- costruzione -----------------------------

function buildStruttura(s: StrutturaGiorno): string {
  // Se chiusa, gli altri campi DEVONO essere 0 (regola del tracciato).
  const aperta = s.aperta;
  const occ = aperta ? nonNegInt(s.camereOccupate, "camereoccupate") : "0";
  const camDisp = aperta ? nonNegInt(s.camereDisponibili, "cameredisponibili") : "0";
  const lettiDisp = aperta ? nonNegInt(s.lettiDisponibili, "lettidisponibili") : "0";
  return (
    "<struttura>" +
    `<apertura>${aperta ? "SI" : "NO"}</apertura>` +
    `<camereoccupate>${occ}</camereoccupate>` +
    `<cameredisponibili>${camDisp}</cameredisponibili>` +
    `<lettidisponibili>${lettiDisp}</lettidisponibili>` +
    "</struttura>"
  );
}

function buildArrivo(a: ArrivoInput): string {
  const tipo = TIPO_ALLOGGIATO_CODE[a.tipoAlloggiato];
  if (!tipo) throw new TracciatoXmlError(`Tipo alloggiato non valido: "${a.tipoAlloggiato}".`);
  if (!SEX_CODE[a.sesso]) throw new TracciatoXmlError(`Sesso non valido: "${a.sesso}".`);

  const idswh = requireMaxLen(requireNonEmpty(a.idswh, "idswh"), 20, "idswh");

  // idcapo obbligatorio per familiari/membri (19/20).
  const alSeguito = TIPI_AL_SEGUITO.has(a.tipoAlloggiato);
  if (alSeguito && (!a.idCapo || a.idCapo.trim() === "")) {
    throw new TracciatoXmlError(
      `idcapo obbligatorio per tipo alloggiato ${a.tipoAlloggiato} (19/20).`,
    );
  }

  requireNonEmpty(a.cittadinanzaCode, "cittadinanza");
  requireNonEmpty(a.statoResidenzaCode, "statoresidenza");
  const luogoResidenza = requireMaxLen(
    requireNonEmpty(a.luogoResidenza, "luogoresidenza"),
    30,
    "luogoresidenza",
  );
  requireNonEmpty(a.tipoTurismo, "tipoturismo");
  requireNonEmpty(a.mezzoTrasporto, "mezzotrasporto");

  // comunenascita ammesso SOLO se nascita in Italia.
  const nascitaItalia = a.statoNascitaCode === ITALIA_CODE;
  if (a.comuneNascitaCode && !nascitaItalia) {
    throw new TracciatoXmlError("comunenascita ammesso solo se statonascita = Italia (100000100).");
  }

  return (
    "<arrivo>" +
    tag("idswh", idswh) +
    tag("tipoalloggiato", tipo) +
    tag("idcapo", a.idCapo, { optional: true }) +
    tag("cognome", a.cognome ? requireMaxLen(a.cognome, 50, "cognome") : "", { optional: true }) +
    tag("nome", a.nome ? requireMaxLen(a.nome, 30, "nome") : "", { optional: true }) +
    tag("sesso", SEX_CODE[a.sesso]) +
    tag("cittadinanza", a.cittadinanzaCode) +
    tag("statoresidenza", a.statoResidenzaCode) +
    tag("luogoresidenza", luogoResidenza) +
    tag("datanascita", toAaaaMmGg(a.dataNascita, "datanascita")) +
    tag("statonascita", a.statoNascitaCode, { optional: true }) +
    tag("comunenascita", nascitaItalia ? a.comuneNascitaCode : "", { optional: true }) +
    tag("tipoturismo", a.tipoTurismo) +
    tag("mezzotrasporto", a.mezzoTrasporto) +
    tag("canaleprenotazione", a.canalePrenotazione, { optional: true }) +
    tag("titolostudio", a.titoloStudio, { optional: true }) +
    tag("professione", a.professione, { optional: true }) +
    tag("esenzioneimposta", a.esenzioneImposta, { optional: true }) +
    "</arrivo>"
  );
}

function buildPartenza(p: PartenzaInput): string {
  const tipo = TIPO_ALLOGGIATO_CODE[p.tipoAlloggiato];
  if (!tipo) throw new TracciatoXmlError(`Tipo alloggiato non valido: "${p.tipoAlloggiato}".`);
  const idswh = requireMaxLen(requireNonEmpty(p.idswh, "idswh"), 20, "idswh");
  return (
    "<partenza>" +
    tag("idswh", idswh) +
    tag("tipoalloggiato", tipo) +
    tag("arrivo", toAaaaMmGg(p.dataArrivo, "arrivo")) +
    "</partenza>"
  );
}

function buildMovimento(g: GiornoMovimento): string {
  const arrivi =
    g.arrivi.length > 0 ? `<arrivi>${g.arrivi.map(buildArrivo).join("")}</arrivi>` : "";
  const partenze =
    g.partenze.length > 0 ? `<partenze>${g.partenze.map(buildPartenza).join("")}</partenze>` : "";
  return (
    "<movimento>" +
    `<data>${toAaaaMmGg(g.data, "data")}</data>` +
    buildStruttura(g.struttura) +
    arrivi +
    partenze +
    "</movimento>"
  );
}

/**
 * Costruisce il file XML Ross1000 completo. Un `<movimento>` per giorno, in ordine crescente di data.
 * Un giorno senza arrivi/partenze (ma con `<struttura>`) È un "movimento zero" valido.
 */
export function buildMovimentiXml(input: MovimentiInput): string {
  requireNonEmpty(input.codice, "codice");
  requireNonEmpty(input.prodotto, "prodotto");

  const giorni = [...input.giorni].sort((a, b) => a.data.localeCompare(b.data));
  const body = giorni.map(buildMovimento).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    "<movimenti>" +
    `<codice>${escapeXml(input.codice)}</codice>` +
    `<prodotto>${escapeXml(input.prodotto)}</prodotto>` +
    body +
    "</movimenti>"
  );
}
