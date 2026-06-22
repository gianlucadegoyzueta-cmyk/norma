// Serializzazione del file "stampa C59" — movimento turistico Umbria (Turismatica / TOLM).
// PURA: input tipizzato → stringa. UN FILE PER GIORNO (es. ggmmaaaa.txt), formato ASCII a COLONNE FISSE.
//
// Fonte: "Acquisizione automatica dati da file di stampa C59 — tracciato record" (Regione Umbria)
//   + esempio reale trasmesso via TOLM. Validato sulle posizioni di colonna dell'esempio.
//
// A differenza di Ross1000/SPOT (nominativi, XML), qui il dato è AGGREGATO per provenienza:
// righe "provincia/stato | arrivati | partiti" più i totali della struttura del giorno.
//
// Layout (colonne 1-based; valore = numero a colonna fissa):
//   R1  denominazione struttura (col 1, varchar 255, riempito a 255)
//   R2  blank
//   R3  "Presenti notte precedente" + valore a col 28
//   R4  "Arrivati"                  + valore a col 28
//   R5  "Totale"                    + valore a col 28   (= presenti precedenti + arrivati)
//   R6  "Partiti"                   + valore a col 28
//   R7  "Presenti nella notte"      + valore a col 28   (= totale − partiti)
//   R8  "CAMERE OCCUPATE="          + valore a col 17
//   R9  "ARRIVATI E PARTITI DEL GIORNO " + data dd-mm-yyyy a col 31
//   R10 blank
//   R11 header "PROVENIENZA ... |ARR. |PAR. |"
//   R12+ righe provenienza: codice(col 1,≤5) | descr(col 7,≤35) | arr(col 43,n5 dx) | par(col 49,n5 dx)
// Separatori "|" alle colonne 6/42/48/54. Fine riga CRLF (come l'esempio ufficiale).
// Il riempimento delle etichette (col 1-27) è cosmetico: l'importer legge il valore alla colonna fissa.

export class UmbriaC59Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UmbriaC59Error";
  }
}

/** Una riga di provenienza aggregata del giorno. */
export interface UmbriaProvenienzaRiga {
  /** Sigla provincia (IT) o codice Turismatica (estero), ≤ 5 caratteri. */
  code: string;
  /** Nome provincia/stato, ≤ 35 caratteri (cosmetico). */
  descrizione: string;
  arrivati: number;
  partiti: number;
}

/** I dati di un singolo giorno (= un file). */
export interface UmbriaGiornoFile {
  denominazione: string;
  data: string; // ISO YYYY-MM-DD
  presentiNottePrecedente: number;
  arrivati: number;
  partiti: number;
  camereOccupate: number;
  provenienze: UmbriaProvenienzaRiga[];
}

const CRLF = "\r\n";
const DENOM_LEN = 255;
const VALUE_COL = 28; // le etichette R3-R7 sono riempite fino a col 27, il valore parte a col 28
const DATE_COL = 31;
const HEADER = "PROVENIENZA".padEnd(41) + "|ARR. |PAR. |";

function nonNegInt(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new UmbriaC59Error(`Campo "${name}" non valido: ${value} (atteso intero ≥ 0).`);
  }
  return value;
}

/** "2015-07-09" → "09-07-2015". */
function isoToDdMmYyyy(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) throw new UmbriaC59Error(`Data non valida (atteso ISO YYYY-MM-DD): "${iso}".`);
  const [, y, mm, dd] = m;
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) {
    throw new UmbriaC59Error(`Data non valida: "${iso}".`);
  }
  return `${dd}-${mm}-${y}`;
}

/** Etichetta riempita fino a (VALUE_COL-1) + valore (left-aligned a colonna VALUE_COL). */
function labelRow(label: string, value: number, name: string): string {
  return label.padEnd(VALUE_COL - 1) + String(nonNegInt(value, name));
}

function provenienzaRow(r: UmbriaProvenienzaRiga): string {
  const code = r.code.trim();
  if (code.length === 0 || code.length > 5) {
    throw new UmbriaC59Error(`Codice provenienza non valido: "${r.code}" (atteso 1-5 caratteri).`);
  }
  const descr = r.descrizione.slice(0, 35);
  const arr = String(nonNegInt(r.arrivati, "arrivati")).padStart(5);
  const par = String(nonNegInt(r.partiti, "partiti")).padStart(5);
  // code(1-5)|descr(7-41)|arr(43-47)|par(49-53)|
  return `${code.padEnd(5)}|${descr.padEnd(35)}|${arr}|${par}|`;
}

/**
 * Costruisce il contenuto del file C59 di UN giorno. `Totale` e `Presenti nella notte` sono derivati
 * (totale = presenti precedenti + arrivati; presenti notte = totale − partiti) per coerenza interna.
 */
export function buildC59Giorno(g: UmbriaGiornoFile): string {
  const presentiPrec = nonNegInt(g.presentiNottePrecedente, "presentiNottePrecedente");
  const arrivati = nonNegInt(g.arrivati, "arrivati");
  const partiti = nonNegInt(g.partiti, "partiti");
  const totale = presentiPrec + arrivati;
  const presentiNotte = totale - partiti;
  if (presentiNotte < 0) {
    throw new UmbriaC59Error(
      `Incoerenza: partiti (${partiti}) > totale presenti (${totale}) il ${g.data}.`,
    );
  }

  const righe = [
    g.denominazione.slice(0, DENOM_LEN).padEnd(DENOM_LEN),
    "",
    labelRow("Presenti notte precedente", presentiPrec, "presentiNottePrecedente"),
    labelRow("Arrivati", arrivati, "arrivati"),
    labelRow("Totale", totale, "totale"),
    labelRow("Partiti", partiti, "partiti"),
    labelRow("Presenti nella notte", presentiNotte, "presentiNellaNotte"),
    "CAMERE OCCUPATE=" + String(nonNegInt(g.camereOccupate, "camereOccupate")),
    "ARRIVATI E PARTITI DEL GIORNO".padEnd(DATE_COL - 1) + isoToDdMmYyyy(g.data),
    "",
    HEADER,
    ...g.provenienze.map(provenienzaRow),
  ];
  return righe.join(CRLF) + CRLF;
}

/** Nome file giornaliero: "ggmmaaaa.txt". */
export function filenameC59(iso: string): string {
  const dd = isoToDdMmYyyy(iso); // valida e riordina
  const [d, m, y] = dd.split("-");
  return `${d}${m}${y}.txt`;
}
