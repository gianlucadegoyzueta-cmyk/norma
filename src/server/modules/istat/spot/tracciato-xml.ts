// Serializzazione del TRACCIATO XML SPOT — movimento turistico Puglia (InnovaPuglia / Pugliapromozione).
// PURA: input tipizzato → stringa XML. Niente I/O, niente dipendenze da Prisma.
//
// Fonte: "SPOT — Modalità Base — Specifiche del sistema" (InnovaPuglia), schema
//   movimentogiornaliero-0.5.xsd / datatype-0.5.xsd; esempio XML ufficiale nell'allegato.
// Riuso con Alloggiati Web: cittadinanza, comune/paese di residenza e tipologia alloggiato usano le
//   STESSE tabelle Polizia di Stato del modulo alloggiati (qui codici-stringa già risolti a monte).
//
// Differenze vs Ross1000 (stesso dominio C/59):
//   - un <movimento> per giorno con attributo type = MP (movimento) | NM (nessun movimento) | EC (chiuso);
//   - i membri di famiglia/gruppo sono ANNIDATI in <componenti> sotto il capo (non lista piatta con idcapo);
//   - le <partenze> sono una lista di <codiceclientesr>;
//   - <eta> e <dayuse> al posto della data di nascita.

import type { Sex, TipoAlloggiato } from "@prisma/client";

/** Codice Paese Italia (tabella Polizia): discrimina residenza per comune (IT) vs paese (estero). */
export const ITALIA_CODE = "100000100";

/** Tipologie ammesse a livello <arrivo> (ospite singolo / capo). I membri 19/20 stanno in <componente>. */
const TIPOLOGIA_ARRIVO_CODE: Partial<Record<TipoAlloggiato, "16" | "17" | "18">> = {
  OSPITE_SINGOLO: "16",
  CAPO_FAMIGLIA: "17",
  CAPO_GRUPPO: "18",
};

/** Tipologie "capo" (17/18): richiedono l'elemento <componenti> (regola 14 della spec). */
const TIPI_CAPO = new Set<TipoAlloggiato>(["CAPO_FAMIGLIA", "CAPO_GRUPPO"]);

const SEX_CODE: Record<Sex, "F" | "M"> = { M: "M", F: "F" };

export class SpotXmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpotXmlError";
  }
}

// ----------------------------- tipi di input (già risolti) -----------------------------

/** Residenza: ESATTAMENTE uno tra comune (Italia) e paese (estero), codici AlloggiatiWeb. */
export interface SpotResidenza {
  comuneResidenzaCode?: string;
  paeseResidenzaCode?: string;
}

/** Membro di una famiglia/gruppo (sotto il capo). Eredita i dati qualitativi dal capo. */
export interface SpotComponente {
  codiceClienteSr: string;
  sesso: Sex;
  cittadinanzaCode: string;
  residenza: SpotResidenza;
  occupaPostoLetto: boolean;
  eta: number;
  titoloStudio?: string;
}

/** Un arrivo (ospite singolo o capo) in un dato giorno. */
export interface SpotArrivo {
  codiceClienteSr: string;
  sesso: Sex;
  cittadinanzaCode: string;
  residenza: SpotResidenza;
  occupaPostoLetto: boolean;
  dayUse: boolean;
  tipologia: TipoAlloggiato; // risolta in 16/17/18; 19/20 non sono ammessi a questo livello
  eta: number;
  /** Obbligatorio se capo (17/18), VIETATO se singolo (16). */
  componenti?: SpotComponente[];
}

/** Dati struttura del giorno (Reg. CE 692/2011): sempre presenti in un movimento MP. */
export interface SpotDatiStruttura {
  camereDisponibili: number;
  postiLettoDisponibili: number;
  camereOccupate: number;
}

export type SpotStato = "MP" | "NM" | "EC";

/** Un giorno di movimento. MP → arrivi/partenze + datiStruttura; NM/EC → elemento vuoto. */
export interface SpotGiorno {
  data: string; // ISO YYYY-MM-DD
  stato: SpotStato;
  arrivi?: SpotArrivo[];
  partenze?: string[]; // codiceclientesr in partenza
  datiStruttura?: SpotDatiStruttura;
}

export interface SpotMovimentiInput {
  /** Nome del gestionale che genera il file (attributo vendor della radice). */
  vendor: string;
  giorni: SpotGiorno[];
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

const SI_NO = (b: boolean): string => (b ? "si" : "no");

function requireNonEmpty(value: string | undefined, name: string): string {
  if (!value || value.trim() === "") {
    throw new SpotXmlError(`Campo "${name}" obbligatorio mancante.`);
  }
  return value;
}

function nonNegInt(value: number, name: string): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new SpotXmlError(`Campo "${name}" non valido: ${value} (atteso intero ≥ 0).`);
  }
  return String(value);
}

/** Valida ISO "YYYY-MM-DD" e lo restituisce invariato (l'attributo data SPOT è in formato ISO). */
function requireIsoDate(iso: string, name: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) {
    throw new SpotXmlError(`Campo "${name}" non valido: atteso ISO YYYY-MM-DD, ricevuto "${iso}".`);
  }
  const [, y, mm, dd] = m;
  // Validità reale di calendario: ricostruisco la data e verifico che i componenti coincidano
  // (scarta es. 2026-02-30, 2026-04-31, 29 feb non bisestile).
  const d = new Date(Date.UTC(Number(y), Number(mm) - 1, Number(dd)));
  if (
    d.getUTCFullYear() !== Number(y) ||
    d.getUTCMonth() !== Number(mm) - 1 ||
    d.getUTCDate() !== Number(dd)
  ) {
    throw new SpotXmlError(`Campo "${name}" non è una data di calendario valida: "${iso}".`);
  }
  return iso;
}

function tag(name: string, value: string): string {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

/** Residenza → esattamente un elemento (comuneresidenza per IT, paeseresidenza per estero). */
function buildResidenza(r: SpotResidenza, ctx: string): string {
  const comune = r.comuneResidenzaCode?.trim();
  const paese = r.paeseResidenzaCode?.trim();
  if (!!comune === !!paese) {
    throw new SpotXmlError(
      `${ctx}: la residenza deve avere ESATTAMENTE uno tra comuneresidenza (Italia) e paeseresidenza (estero).`,
    );
  }
  return comune ? tag("comuneresidenza", comune) : tag("paeseresidenza", paese!);
}

// ----------------------------- costruzione -----------------------------

function buildComponente(c: SpotComponente): string {
  if (!SEX_CODE[c.sesso]) throw new SpotXmlError(`Sesso non valido: "${c.sesso}".`);
  return (
    "<componente>" +
    tag("codiceclientesr", requireNonEmpty(c.codiceClienteSr, "codiceclientesr")) +
    tag("sesso", SEX_CODE[c.sesso]) +
    tag("cittadinanza", requireNonEmpty(c.cittadinanzaCode, "cittadinanza")) +
    buildResidenza(c.residenza, "componente") +
    tag("occupazionepostoletto", SI_NO(c.occupaPostoLetto)) +
    tag("eta", nonNegInt(c.eta, "eta")) +
    (c.titoloStudio ? tag("titolostudio", c.titoloStudio) : "") +
    "</componente>"
  );
}

function buildArrivo(a: SpotArrivo): string {
  const tipo = TIPOLOGIA_ARRIVO_CODE[a.tipologia];
  if (!tipo) {
    throw new SpotXmlError(
      `Tipologia "${a.tipologia}" non ammessa a livello <arrivo>: usare 16/17/18 (i membri 19/20 vanno in <componenti>).`,
    );
  }
  if (!SEX_CODE[a.sesso]) throw new SpotXmlError(`Sesso non valido: "${a.sesso}".`);

  const isCapo = TIPI_CAPO.has(a.tipologia);
  const componenti = a.componenti ?? [];
  if (isCapo && componenti.length === 0) {
    throw new SpotXmlError(
      `Tipologia ${a.tipologia} (capo): l'elemento <componenti> è obbligatorio e non vuoto (regola 14).`,
    );
  }
  if (!isCapo && componenti.length > 0) {
    throw new SpotXmlError(
      "Ospite singolo (16): l'elemento <componenti> non è ammesso (regola 14).",
    );
  }

  const componentiXml =
    componenti.length > 0
      ? `<componenti>${componenti.map(buildComponente).join("")}</componenti>`
      : "";

  return (
    "<arrivo>" +
    tag("codiceclientesr", requireNonEmpty(a.codiceClienteSr, "codiceclientesr")) +
    tag("sesso", SEX_CODE[a.sesso]) +
    tag("cittadinanza", requireNonEmpty(a.cittadinanzaCode, "cittadinanza")) +
    buildResidenza(a.residenza, "arrivo") +
    tag("occupazionepostoletto", SI_NO(a.occupaPostoLetto)) +
    tag("dayuse", SI_NO(a.dayUse)) +
    tag("tipologiaalloggiato", tipo) +
    tag("eta", nonNegInt(a.eta, "eta")) +
    componentiXml +
    "</arrivo>"
  );
}

function buildDatiStruttura(s: SpotDatiStruttura): string {
  const camDisp = Number(nonNegInt(s.camereDisponibili, "cameredisponibili"));
  const letti = Number(nonNegInt(s.postiLettoDisponibili, "postilettodisponibili"));
  const occ = Number(nonNegInt(s.camereOccupate, "camereoccupate"));
  if (occ > camDisp) {
    throw new SpotXmlError(
      `camereoccupate (${occ}) non può superare cameredisponibili (${camDisp}) (regola 17).`,
    );
  }
  if (camDisp > letti) {
    throw new SpotXmlError(
      `cameredisponibili (${camDisp}) non può superare postilettodisponibili (${letti}) (regola 18).`,
    );
  }
  return (
    "<datistruttura>" +
    tag("cameredisponibili", String(camDisp)) +
    tag("postilettodisponibili", String(letti)) +
    tag("camereoccupate", String(occ)) +
    "</datistruttura>"
  );
}

function buildMovimento(g: SpotGiorno): string {
  const data = requireIsoDate(g.data, "data");
  const arrivi = g.arrivi ?? [];
  const partenze = g.partenze ?? [];

  if (g.stato !== "MP") {
    // NM (nessun movimento) / EC (esercizio chiuso): elemento vuoto, senza figli.
    if (arrivi.length > 0 || partenze.length > 0 || g.datiStruttura) {
      throw new SpotXmlError(
        `Movimento ${g.stato} del ${data}: non sono ammessi arrivi/partenze/datistruttura.`,
      );
    }
    return `<movimento type="${g.stato}" data="${data}"/>`;
  }

  // MP: almeno un arrivo o una partenza (regola 13); datistruttura obbligatorio.
  if (arrivi.length === 0 && partenze.length === 0) {
    throw new SpotXmlError(
      `Movimento MP del ${data}: serve almeno un arrivo o una partenza (regola 13).`,
    );
  }
  if (!g.datiStruttura) {
    throw new SpotXmlError(`Movimento MP del ${data}: <datistruttura> obbligatorio.`);
  }

  const arriviXml = arrivi.length > 0 ? `<arrivi>${arrivi.map(buildArrivo).join("")}</arrivi>` : "";
  const partenzeXml =
    partenze.length > 0
      ? `<partenze>${partenze
          .map((c) => tag("codiceclientesr", requireNonEmpty(c, "codiceclientesr")))
          .join("")}</partenze>`
      : "";

  return (
    `<movimento type="MP" data="${data}">` +
    arriviXml +
    partenzeXml +
    buildDatiStruttura(g.datiStruttura) +
    "</movimento>"
  );
}

/**
 * Costruisce il file XML SPOT completo. Un <movimento> per giorno, in ordine crescente di data
 * (la spec richiede date sequenziali: l'assenza di un giorno interrompe l'elaborazione lato portale).
 */
export function buildSpotXml(input: SpotMovimentiInput): string {
  const vendor = requireNonEmpty(input.vendor, "vendor");
  const giorni = [...input.giorni].sort((a, b) => a.data.localeCompare(b.data));
  const body = giorni.map(buildMovimento).join("");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<movimenti xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
    ' xsi:noNamespaceSchemaLocation="movimentogiornaliero-0.5.xsd"' +
    ` vendor="${escapeXml(vendor)}">` +
    body +
    "</movimenti>"
  );
}
