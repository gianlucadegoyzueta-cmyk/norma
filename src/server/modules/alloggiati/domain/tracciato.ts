import type { Sex, TipoAlloggiato } from "@prisma/client";

/**
 * Serializzazione del TRACCIATO RECORD di Alloggiati Web (larghezza fissa).
 *
 * Fonte: manuale WS_ALLOGGIATI Rev.01 (vedi docs/alloggiati-web-analisi-fattibilita.md):
 *  - TABELLA 1 (standard): 168 caratteri dati.
 *  - TABELLA 2 (file unico, utenze "Gestione Appartamenti"): 174 caratteri (aggiunge ID Appartamento).
 *
 * Questa funzione è PURA: input già "risolto" (codici delle tabelle ufficiali) → stringa.
 * NON aggiunge CR/LF: il web service `Send` vuole una lista di stringhe (una riga ciascuna);
 * il CR/LF serve solo al file .txt del fallback PEC, ed è il chiamante a unirle.
 *
 * Costruzione PER POSIZIONE (buffer di spazi + place a offset esatto): qualsiasi errore di
 * lunghezza di un campo viene intercettato subito, invece di sfasare silenziosamente la riga.
 */

export const TRACCIATO_LEN = 168;
export const TRACCIATO_FILE_UNICO_LEN = 174;

/** Posizioni e lunghezze ufficiali (0-based). Unica fonte di verità per costruzione e test. */
export const FIELD_LAYOUT = {
  tipoAlloggiato: { start: 0, len: 2 },
  dataArrivo: { start: 2, len: 10 },
  giorniPermanenza: { start: 12, len: 2 },
  cognome: { start: 14, len: 50 },
  nome: { start: 64, len: 30 },
  sesso: { start: 94, len: 1 },
  dataNascita: { start: 95, len: 10 },
  comuneNascita: { start: 105, len: 9 },
  provinciaNascita: { start: 114, len: 2 },
  statoNascita: { start: 116, len: 9 },
  cittadinanza: { start: 125, len: 9 },
  tipoDocumento: { start: 134, len: 5 },
  numeroDocumento: { start: 139, len: 20 },
  luogoRilascioDocumento: { start: 159, len: 9 },
  idAppartamento: { start: 168, len: 6 }, // solo file unico
} as const;

/** Codici tipo alloggiato (Tabella Tipi_Alloggiato). Verificati dal manuale (pagg. 19-20). */
export const TIPO_ALLOGGIATO_CODE: Record<TipoAlloggiato, string> = {
  OSPITE_SINGOLO: "16",
  CAPO_FAMIGLIA: "17",
  CAPO_GRUPPO: "18",
  FAMILIARE: "19",
  MEMBRO_GRUPPO: "20",
};

/** Tipi per cui il DOCUMENTO è obbligatorio (16/17/18). Per 19/20 i campi documento vanno in BIANCO. */
const TIPI_CON_DOCUMENTO = new Set<TipoAlloggiato>([
  "OSPITE_SINGOLO",
  "CAPO_FAMIGLIA",
  "CAPO_GRUPPO",
]);

/** True se il tipo alloggiato richiede il documento (16/17/18); false per 19/20. */
export function requiresDocument(tipo: TipoAlloggiato): boolean {
  return TIPI_CON_DOCUMENTO.has(tipo);
}

/** Sesso → codice tracciato: 1=M, 2=F (manuale). */
const SEX_CODE: Record<Sex, string> = { M: "1", F: "2" };

export class TracciatoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TracciatoError";
  }
}

/** Input GIÀ RISOLTO per costruire una schedina. Le date sono ISO "YYYY-MM-DD" (no fuso orario). */
export interface TracciatoInput {
  tipoAlloggiato: TipoAlloggiato;
  dataArrivo: string; // ISO YYYY-MM-DD
  giorniPermanenza: number; // 1..30
  cognome: string;
  nome: string;
  sesso: Sex;
  dataNascita: string; // ISO YYYY-MM-DD
  statoNascitaCode: string; // 9 — SEMPRE obbligatorio (Tabella Stati)
  cittadinanzaCode: string; // 9 — SEMPRE obbligatorio (Tabella Stati)
  // Nascita in Italia → comune + provincia presenti; estero → entrambi assenti.
  comuneNascitaCode?: string; // 9 (Tabella Comuni)
  provinciaNascita?: string; // 2 (sigla)
  // Documento: obbligatorio per 16/17/18; ignorato (in bianco) per 19/20.
  tipoDocumentoCode?: string; // 5 (Tabella Documenti)
  numeroDocumento?: string; // <=20 (testo)
  luogoRilascioCode?: string; // 9 (Stato o Comune; per stranieri è lo Stato)
}

// ----------------------- helper di campo (ognuno restituisce ESATTAMENTE `len` char) -----------------------

const blank = (len: number): string => " ".repeat(len);

/** Campo testo: allineato a sinistra, riempito di spazi a destra, troncato a `len` se più lungo. */
function textField(value: string, len: number): string {
  return value.length > len ? value.slice(0, len) : value.padEnd(len, " ");
}

/** Campo codice: usato verbatim dalla tabella ufficiale → deve avere ESATTAMENTE `len` caratteri. */
function codeField(value: string, len: number, name: string): string {
  if (value.length !== len) {
    throw new TracciatoError(
      `Codice "${name}" di lunghezza errata: attesi ${len}, ricevuti ${value.length} ("${value}"). ` +
        `I codici delle tabelle ufficiali devono essere salvati alla larghezza esatta del campo.`,
    );
  }
  return value;
}

/** Campo numerico: zero-padding a sinistra (es. 5 → "05"), come le date usano gli zeri iniziali. */
function numField(value: number, len: number, name: string): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new TracciatoError(`Campo "${name}" non valido: ${value} (atteso intero ≥ 0).`);
  }
  const s = String(value);
  if (s.length > len) {
    throw new TracciatoError(`Campo "${name}": ${value} non entra in ${len} cifre.`);
  }
  return s.padStart(len, "0");
}

/** Converte ISO "YYYY-MM-DD" → "gg/mm/aaaa" (10 char), con validazione minima. */
function formatDateIT(iso: string, name: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) {
    throw new TracciatoError(`Campo "${name}" non valido: atteso ISO YYYY-MM-DD, ricevuto "${iso}".`);
  }
  const [, year, month, day] = m;
  const mm = Number(month);
  const dd = Number(day);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    throw new TracciatoError(`Campo "${name}" non è una data valida: "${iso}".`);
  }
  return `${day}/${month}/${year}`;
}

function validateGiorni(n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > 30) {
    throw new TracciatoError(`Giorni di permanenza non validi: ${n} (ammessi 1..30, manuale "Massimo 30 gg").`);
  }
  return n;
}

/** Scrive `value` (che DEVE essere lungo `len`) nel buffer a partire da `start`. */
function place(buffer: string[], start: number, value: string, len: number, name: string): void {
  if (value.length !== len) {
    throw new TracciatoError(`Bug interno: campo "${name}" lungo ${value.length}, atteso ${len}.`);
  }
  for (let i = 0; i < len; i++) buffer[start + i] = value[i];
}

// ----------------------- costruzione del record -----------------------

/**
 * Costruisce la riga del tracciato.
 * @param options.idAppartamento se presente → record "file unico" (174 char) con ID in coda;
 *                               se assente → record standard (168 char).
 */
export function buildTracciatoRecord(
  input: TracciatoInput,
  options: { idAppartamento?: number } = {},
): string {
  const tipoCode = TIPO_ALLOGGIATO_CODE[input.tipoAlloggiato];
  if (!tipoCode) throw new TracciatoError(`Tipo alloggiato non valido: "${input.tipoAlloggiato}".`);

  if (!SEX_CODE[input.sesso]) throw new TracciatoError(`Sesso non valido: "${input.sesso}" (atteso M o F).`);
  if (!input.cognome?.trim()) throw new TracciatoError("Cognome obbligatorio.");
  if (!input.nome?.trim()) throw new TracciatoError("Nome obbligatorio.");

  // Comune e Provincia: entrambi (nascita in Italia) o nessuno (estero).
  const hasComune = !!input.comuneNascitaCode;
  const hasProvincia = !!input.provinciaNascita;
  if (hasComune !== hasProvincia) {
    throw new TracciatoError(
      "Comune e Provincia di nascita devono essere entrambi presenti (Italia) o entrambi assenti (estero).",
    );
  }

  // Documento: obbligatorio per 16/17/18; in BIANCO per 19/20 (a prescindere dall'input).
  const richiedeDocumento = TIPI_CON_DOCUMENTO.has(input.tipoAlloggiato);
  let tipoDoc: string;
  let numDoc: string;
  let luogoDoc: string;
  if (richiedeDocumento) {
    if (!input.tipoDocumentoCode || !input.numeroDocumento?.trim() || !input.luogoRilascioCode) {
      throw new TracciatoError(
        `Documento obbligatorio per tipo alloggiato ${input.tipoAlloggiato} (16/17/18): ` +
          "servono tipo documento, numero e luogo di rilascio.",
      );
    }
    tipoDoc = codeField(input.tipoDocumentoCode, FIELD_LAYOUT.tipoDocumento.len, "Tipo Documento");
    numDoc = textField(input.numeroDocumento, FIELD_LAYOUT.numeroDocumento.len);
    luogoDoc = codeField(input.luogoRilascioCode, FIELD_LAYOUT.luogoRilascioDocumento.len, "Luogo Rilascio");
  } else {
    tipoDoc = blank(FIELD_LAYOUT.tipoDocumento.len);
    numDoc = blank(FIELD_LAYOUT.numeroDocumento.len);
    luogoDoc = blank(FIELD_LAYOUT.luogoRilascioDocumento.len);
  }

  const fileUnico = options.idAppartamento !== undefined;
  const totalLen = fileUnico ? TRACCIATO_FILE_UNICO_LEN : TRACCIATO_LEN;
  const buffer: string[] = new Array<string>(totalLen).fill(" ");
  const L = FIELD_LAYOUT;

  place(buffer, L.tipoAlloggiato.start, codeField(tipoCode, L.tipoAlloggiato.len, "Tipo Alloggiato"), L.tipoAlloggiato.len, "Tipo Alloggiato");
  place(buffer, L.dataArrivo.start, formatDateIT(input.dataArrivo, "Data Arrivo"), L.dataArrivo.len, "Data Arrivo");
  place(buffer, L.giorniPermanenza.start, numField(validateGiorni(input.giorniPermanenza), L.giorniPermanenza.len, "Giorni Permanenza"), L.giorniPermanenza.len, "Giorni Permanenza");
  place(buffer, L.cognome.start, textField(input.cognome, L.cognome.len), L.cognome.len, "Cognome");
  place(buffer, L.nome.start, textField(input.nome, L.nome.len), L.nome.len, "Nome");
  place(buffer, L.sesso.start, SEX_CODE[input.sesso], L.sesso.len, "Sesso");
  place(buffer, L.dataNascita.start, formatDateIT(input.dataNascita, "Data Nascita"), L.dataNascita.len, "Data Nascita");
  place(buffer, L.comuneNascita.start, hasComune ? codeField(input.comuneNascitaCode!, L.comuneNascita.len, "Comune Nascita") : blank(L.comuneNascita.len), L.comuneNascita.len, "Comune Nascita");
  place(buffer, L.provinciaNascita.start, hasProvincia ? codeField(input.provinciaNascita!, L.provinciaNascita.len, "Provincia Nascita") : blank(L.provinciaNascita.len), L.provinciaNascita.len, "Provincia Nascita");
  place(buffer, L.statoNascita.start, codeField(input.statoNascitaCode, L.statoNascita.len, "Stato Nascita"), L.statoNascita.len, "Stato Nascita");
  place(buffer, L.cittadinanza.start, codeField(input.cittadinanzaCode, L.cittadinanza.len, "Cittadinanza"), L.cittadinanza.len, "Cittadinanza");
  place(buffer, L.tipoDocumento.start, tipoDoc, L.tipoDocumento.len, "Tipo Documento");
  place(buffer, L.numeroDocumento.start, numDoc, L.numeroDocumento.len, "Numero Documento");
  place(buffer, L.luogoRilascioDocumento.start, luogoDoc, L.luogoRilascioDocumento.len, "Luogo Rilascio");

  if (fileUnico) {
    place(buffer, L.idAppartamento.start, numField(options.idAppartamento!, L.idAppartamento.len, "ID Appartamento"), L.idAppartamento.len, "ID Appartamento");
  }

  const record = buffer.join("");
  if (record.length !== totalLen) {
    throw new TracciatoError(`Lunghezza record errata: ${record.length} (atteso ${totalLen}).`);
  }
  return record;
}

/** Utility: Date → ISO "YYYY-MM-DD" in UTC (per evitare slittamenti di fuso). Per il chiamante/resolver. */
export function toISODateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}
