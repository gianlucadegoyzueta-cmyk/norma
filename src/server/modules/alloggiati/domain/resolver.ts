import type { Guest, Stay } from "@prisma/client";
import {
  type TracciatoInput,
  buildTracciatoRecord,
  requiresDocument,
  toISODateUTC,
} from "./tracciato";

/**
 * Resolver: Guest + Stay → TracciatoInput.
 *
 * Risolve i codici dalle tabelle di riferimento (Comuni/Stati/Documenti), converte le date in
 * ISO UTC, calcola i giorni di permanenza, e produce l'input PRONTO per buildTracciatoRecord.
 *
 * È PURO: le tabelle sono iniettate (ReferenceTables) e già in memoria → niente DB né web service.
 * Il livello DB (futuro) precaricherà le tabelle e costruirà ReferenceTables, poi chiamerà qui.
 */

/** Sottoinsieme di Guest necessario (legato allo schema Prisma via Pick → resta in sync). */
export type ResolverGuest = Pick<
  Guest,
  | "firstName"
  | "lastName"
  | "sex"
  | "birthDate"
  | "birthCountryId"
  | "birthComuneId"
  | "citizenshipId"
  | "documentTypeId"
  | "documentNumber"
  | "documentPlaceId"
  | "tipoAlloggiato"
>;

/** Sottoinsieme di Stay necessario. */
export type ResolverStay = Pick<Stay, "arrivalDate" | "departureDate">;

/** Lookups verso le tabelle ufficiali (già caricate in memoria). Restituiscono il codice esatto. */
export interface ReferenceTables {
  comune(id: string): { code: string; provincia: string } | undefined;
  country(id: string): { code: string } | undefined;
  documentType(id: string): { code: string } | undefined;
}

export class ResolverError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolverError";
  }
}

/** Differenza in giorni di calendario (UTC) tra due date. */
function daysBetweenUTC(arrival: Date, departure: Date): number {
  const a = Date.UTC(arrival.getUTCFullYear(), arrival.getUTCMonth(), arrival.getUTCDate());
  const d = Date.UTC(departure.getUTCFullYear(), departure.getUTCMonth(), departure.getUTCDate());
  return Math.round((d - a) / 86_400_000);
}

/**
 * Luogo di rilascio documento: può essere uno Stato (stranieri) o un Comune (italiani).
 * Gli id sono cuid globalmente unici → un id appartiene al più a UNA tabella:
 * provo prima i Comuni, poi gli Stati. (Vedi nota nei flag: niente discriminatore esplicito nello schema.)
 */
function resolveLuogoRilascio(id: string, refs: ReferenceTables): string {
  const comune = refs.comune(id);
  if (comune) return comune.code;
  const country = refs.country(id);
  if (country) return country.code;
  throw new ResolverError(
    `Luogo di rilascio documento non trovato né tra i Comuni né tra gli Stati (id "${id}").`,
  );
}

/** Risolve Guest+Stay nell'input del tracciato. Lancia ResolverError su dati mancanti/incoerenti. */
export function resolveTracciatoInput(
  guest: ResolverGuest,
  stay: ResolverStay,
  refs: ReferenceTables,
): TracciatoInput {
  // --- giorni di permanenza (dalla differenza arrivo → partenza) ---
  if (!stay.departureDate) {
    throw new ResolverError(
      "Data di partenza mancante: impossibile determinare i giorni di permanenza.",
    );
  }
  const diff = daysBetweenUTC(stay.arrivalDate, stay.departureDate);
  if (diff < 0) {
    throw new ResolverError("Data di partenza precedente alla data di arrivo.");
  }
  const giorniPermanenza = Math.max(1, diff); // soggiorno in giornata → 1 (vedi flag su semantica)

  // --- Stato di nascita e Cittadinanza (SEMPRE obbligatori) ---
  const statoNascita = refs.country(guest.birthCountryId);
  if (!statoNascita) {
    throw new ResolverError(
      `Stato di nascita non trovato in tabella (id "${guest.birthCountryId}").`,
    );
  }
  const cittadinanza = refs.country(guest.citizenshipId);
  if (!cittadinanza) {
    throw new ResolverError(`Cittadinanza non trovata in tabella (id "${guest.citizenshipId}").`);
  }

  // --- Comune/Provincia di nascita: solo se nascita in Italia (birthComuneId presente) ---
  let comuneNascitaCode: string | undefined;
  let provinciaNascita: string | undefined;
  if (guest.birthComuneId) {
    const comune = refs.comune(guest.birthComuneId);
    if (!comune) {
      throw new ResolverError(
        `Comune di nascita non trovato in tabella (id "${guest.birthComuneId}").`,
      );
    }
    comuneNascitaCode = comune.code;
    provinciaNascita = comune.provincia;
  }

  // --- Documento: solo per 16/17/18; per 19/20 si lascia indefinito (buildTracciatoRecord lo mette in bianco) ---
  let tipoDocumentoCode: string | undefined;
  let numeroDocumento: string | undefined;
  let luogoRilascioCode: string | undefined;
  if (requiresDocument(guest.tipoAlloggiato)) {
    if (!guest.documentTypeId || !guest.documentNumber?.trim() || !guest.documentPlaceId) {
      throw new ResolverError(
        `Documento mancante per tipo alloggiato ${guest.tipoAlloggiato} (16/17/18): ` +
          "servono tipo documento, numero e luogo di rilascio.",
      );
    }
    const tipoDoc = refs.documentType(guest.documentTypeId);
    if (!tipoDoc) {
      throw new ResolverError(
        `Tipo documento non trovato in tabella (id "${guest.documentTypeId}").`,
      );
    }
    tipoDocumentoCode = tipoDoc.code;
    numeroDocumento = guest.documentNumber;
    luogoRilascioCode = resolveLuogoRilascio(guest.documentPlaceId, refs);
  }

  return {
    tipoAlloggiato: guest.tipoAlloggiato,
    dataArrivo: toISODateUTC(stay.arrivalDate),
    giorniPermanenza,
    cognome: guest.lastName,
    nome: guest.firstName,
    sesso: guest.sex,
    dataNascita: toISODateUTC(guest.birthDate),
    statoNascitaCode: statoNascita.code,
    cittadinanzaCode: cittadinanza.code,
    comuneNascitaCode,
    provinciaNascita,
    tipoDocumentoCode,
    numeroDocumento,
    luogoRilascioCode,
  };
}

/**
 * Comodità end-to-end: Guest+Stay → riga del tracciato (168, o 174 se `idAppartamento`).
 * È la funzione che lo strato DB userà al posto del segnaposto `buildRecord` in outbox.service.ts,
 * dopo aver caricato le tabelle di riferimento.
 */
export function buildRecordFromEntities(
  guest: ResolverGuest,
  stay: ResolverStay,
  refs: ReferenceTables,
  options: { idAppartamento?: number } = {},
): string {
  return buildTracciatoRecord(resolveTracciatoInput(guest, stay, refs), options);
}

// ----------------------- helper per costruire ReferenceTables (test + futuro adapter) -----------------------

export interface ComuneRow {
  id: string;
  code: string;
  provincia: string;
}
export interface CodeRow {
  id: string;
  code: string;
}

/** Costruisce ReferenceTables in memoria da semplici array (usato nei test; riusabile dall'adapter DB). */
export function createReferenceTables(data: {
  comuni?: readonly ComuneRow[];
  countries?: readonly CodeRow[];
  documentTypes?: readonly CodeRow[];
}): ReferenceTables {
  const comuni = new Map<string, { code: string; provincia: string }>();
  for (const c of data.comuni ?? []) comuni.set(c.id, { code: c.code, provincia: c.provincia });
  const countries = new Map<string, { code: string }>();
  for (const c of data.countries ?? []) countries.set(c.id, { code: c.code });
  const documentTypes = new Map<string, { code: string }>();
  for (const d of data.documentTypes ?? []) documentTypes.set(d.id, { code: d.code });
  return {
    comune: (id) => comuni.get(id),
    country: (id) => countries.get(id),
    documentType: (id) => documentTypes.get(id),
  };
}
