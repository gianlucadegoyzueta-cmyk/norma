// Parser del PDF "Ricevuta di invio" REALE di Alloggiati Web.
//
// VERDETTO Gate #0 (2026-06-10, campione: ricevuta del 2026-03-25, account RM034683):
// la Ricevuta è un documento AGGREGATO. Contiene i dati della struttura e il CONTEGGIO
// delle schedine inviate nel giorno — NESSUN nominativo degli ospiti. La riconciliazione
// T+1 per-identità ipotizzata in docs/architettura §1.3 [SUPPOSIZIONE] non è realizzabile
// via Ricevuta: si riconcilia per CONTEGGIO (schedine attese vs "SCHEDINE INVIATE").
//
// Questo modulo è PURO (niente I/O, niente dipendenze PDF): riceve il TESTO già estratto
// dal PDF (vedi adapters/ricevuta-pdf-text.ts) e ne fa il parsing. Tollera sia l'output
// "one-line" di pdf.js/unpdf sia quello multilinea di pdftotext.

import { AlloggiatiProtocolError } from "../soap/errors";

/** Dati estratti dalla Ricevuta di invio (aggregati per giorno/credenziale). */
export interface RicevutaSummary {
  /** Login Alloggiati (es. "RM034683"). */
  login: string | null;
  /** Categoria struttura (es. "APP.TO USO TURISTICO/LOCAZIONE PURA"). */
  categoria: string | null;
  /** Intestazione struttura come riportata (può includere nominativo titolare). */
  struttura: string | null;
  comune: string | null;
  indirizzo: string | null;
  /** P.IVA o codice fiscale della struttura. */
  pivaCodiceFiscale: string | null;
  /** Identificativo ricevuta, raw (es. "2026/398755 [RM]"). */
  idRicevuta: string;
  /** Data di invio in ISO "YYYY-MM-DD". */
  dataInvio: string;
  /** Numero di schedine inviate nel giorno (il dato chiave per la riconciliazione). */
  schedineInviate: number;
  /** Giorni di permanenza presunta totale (se presente). */
  ggPermanenzaTotale: number | null;
  /** Questura di destinazione (es. "ROMA"). */
  questura: string | null;
}

// Etichette nell'ordine in cui compaiono nel documento.
const LABELS = [
  "LOGIN",
  "CATEGORIA",
  "STRUTTURA",
  "COMUNE",
  "INDIRIZZO",
  "P.IVA/C.F.",
  "ID. RICEVUTA",
  "DATA DI INVIO",
  "SCHEDINE INVIATE",
  "GG PERMANENZA PRESUNTA TOT.",
  "ALLA QUESTURA",
] as const;

type Label = (typeof LABELS)[number];

const FOOTER = "Codice di Controllo";

/** Normalizza il testo estratto: spazi multipli/newline → spazio singolo. */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** Riconosce l'header "RICEVUTA DI INVIO" anche se letter-spaced ("R I C E V U T A …"). */
function hasRicevutaHeader(normalized: string): boolean {
  const compact = normalized.replace(/ /g, "");
  return compact.includes("RICEVUTADIINVIO");
}

/**
 * Estrae il valore compreso tra un'etichetta e la successiva presente nel testo.
 * Ritorna null se l'etichetta non c'è o il valore è vuoto.
 */
function valueBetween(normalized: string, label: Label): string | null {
  const start = normalized.indexOf(label);
  if (start === -1) return null;
  const from = start + label.length;
  // Confine: la prossima etichetta (o il footer) che compare DOPO questa.
  let end = normalized.length;
  for (const other of [...LABELS, FOOTER]) {
    if (other === label) continue;
    const idx = normalized.indexOf(other, from);
    if (idx !== -1 && idx < end) end = idx;
  }
  const raw = normalized.slice(from, end).trim();
  return raw === "" ? null : raw;
}

/** "25/03/2026" → "2026-03-25" (valida giorno/mese, non solo il formato). */
function italianDateToIso(value: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return `${yyyy}-${mm}-${dd}`;
}

function parsePositiveInt(value: string | null): number | null {
  if (value === null) return null;
  if (!/^\d+$/.test(value.trim())) return null;
  return Number(value.trim());
}

/**
 * Parsa il TESTO di una Ricevuta di invio reale.
 *
 * Campi OBBLIGATORI (errore se assenti/malformati): ID. RICEVUTA, DATA DI INVIO,
 * SCHEDINE INVIATE — sono quelli su cui si fonda la riconciliazione per conteggio.
 * Gli altri campi sono best-effort (null se assenti): il layout non è documentato
 * ufficialmente e può variare.
 */
export function parseRicevutaSummaryText(text: string): RicevutaSummary {
  const normalized = normalize(text);

  if (!hasRicevutaHeader(normalized)) {
    throw new AlloggiatiProtocolError(
      "Ricevuta: testo senza header 'RICEVUTA DI INVIO' — non è una ricevuta riconosciuta.",
    );
  }

  const idRicevuta = valueBetween(normalized, "ID. RICEVUTA");
  if (idRicevuta === null) {
    throw new AlloggiatiProtocolError("Ricevuta: campo 'ID. RICEVUTA' assente.");
  }

  const dataInvioRaw = valueBetween(normalized, "DATA DI INVIO");
  const dataInvio = dataInvioRaw === null ? null : italianDateToIso(dataInvioRaw);
  if (dataInvio === null) {
    throw new AlloggiatiProtocolError(
      `Ricevuta: campo 'DATA DI INVIO' assente o malformato (atteso GG/MM/AAAA, trovato: ${JSON.stringify(dataInvioRaw)}).`,
    );
  }

  const schedineInviate = parsePositiveInt(valueBetween(normalized, "SCHEDINE INVIATE"));
  if (schedineInviate === null) {
    throw new AlloggiatiProtocolError("Ricevuta: campo 'SCHEDINE INVIATE' assente o non numerico.");
  }

  return {
    login: valueBetween(normalized, "LOGIN"),
    categoria: valueBetween(normalized, "CATEGORIA"),
    struttura: valueBetween(normalized, "STRUTTURA"),
    comune: valueBetween(normalized, "COMUNE"),
    indirizzo: valueBetween(normalized, "INDIRIZZO"),
    pivaCodiceFiscale: valueBetween(normalized, "P.IVA/C.F."),
    idRicevuta,
    dataInvio,
    schedineInviate,
    ggPermanenzaTotale: parsePositiveInt(valueBetween(normalized, "GG PERMANENZA PRESUNTA TOT.")),
    questura: valueBetween(normalized, "ALLA QUESTURA"),
  };
}
