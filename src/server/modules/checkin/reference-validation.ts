import type { PersonErrorCode } from "@/app/stays/guest-validation";
import type { GuestData } from "@/server/modules/stays";

/**
 * Difesa in profondità sugli ID delle tabelle di riferimento del check-in pubblico.
 *
 * `validatePerson` impone la PRESENZA dei campi obbligatori, ma non può sapere se un ID inviato dal
 * form esiste davvero a DB: il check-in è una pagina PUBBLICA, quindi i valori di select/combobox
 * sono manipolabili (DevTools, replay, tabella aggiornata fra render e submit). Se un ID inesistente
 * arrivasse a `addGuests`, Prisma lancerebbe un errore di foreign key e l'ospite vedrebbe un generico
 * "riprova" senza capire quale campo correggere. Qui verifichiamo l'ESISTENZA e restituiamo un
 * codice di errore PER-CAMPO (localizzato a valle nelle 5 lingue), così l'ospite sa cosa riscegliere.
 *
 * Modulo PURO (nessun Prisma): riceve gli insiemi di ID esistenti già caricati dalla server action,
 * così è testabile senza DB e l'I/O resta nell'adapter (pattern del modulo).
 */

/** Insiemi di ID esistenti per tabella, caricati in batch dalla server action (una query per tabella). */
export interface ExistingReferenceIds {
  /** ID validi della tabella Country (Stati). */
  countries: ReadonlySet<string>;
  /** ID validi della tabella Comune. */
  comuni: ReadonlySet<string>;
  /** ID validi della tabella DocumentType. */
  documentTypes: ReadonlySet<string>;
}

/**
 * Verifica che ogni ID di riferimento PRESENTE nei dati ospite esista negli insiemi forniti.
 * Ritorna una mappa campo→codice per i soli campi con un ID presente ma inesistente; vuota se tutto ok.
 *
 * Note di mapping (riflettono lo schema Prisma e ciò che il form invia):
 *  - birthCountryId / citizenshipId / residenceCountryId → Country
 *  - birthComuneId / residenceComuneId                   → Comune
 *  - documentTypeId                                      → DocumentType
 *  - documentPlaceId  → "luogo": può essere un Comune (IT) O un Country (estero), come la lista
 *    `luoghi` mostrata dal form; valido se esiste in UNO dei due insiemi.
 *
 * I campi facoltativi (comune/residenza) vengono controllati SOLO se valorizzati (null = nessun errore).
 */
export function validateReferenceIds(
  data: Pick<
    GuestData,
    | "birthCountryId"
    | "citizenshipId"
    | "birthComuneId"
    | "residenceCountryId"
    | "residenceComuneId"
    | "documentTypeId"
    | "documentPlaceId"
  >,
  existing: ExistingReferenceIds,
): Record<string, PersonErrorCode> {
  const errors: Record<string, PersonErrorCode> = {};

  const checkCountry = (id: string | null | undefined, field: string, code: PersonErrorCode) => {
    if (id && !existing.countries.has(id)) errors[field] = code;
  };
  const checkComune = (id: string | null | undefined, field: string, code: PersonErrorCode) => {
    if (id && !existing.comuni.has(id)) errors[field] = code;
  };

  checkCountry(data.birthCountryId, "birthCountryId", "birthCountryUnknown");
  checkCountry(data.citizenshipId, "citizenshipId", "citizenshipUnknown");
  checkCountry(data.residenceCountryId, "residenceCountryId", "residenceCountryUnknown");
  checkComune(data.birthComuneId, "birthComuneId", "birthComuneUnknown");
  checkComune(data.residenceComuneId, "residenceComuneId", "residenceComuneUnknown");

  if (data.documentTypeId && !existing.documentTypes.has(data.documentTypeId)) {
    errors.documentTypeId = "documentTypeUnknown";
  }

  // Luogo di rilascio: valido se è un Comune O un Country (il form lo pesca da entrambe le liste).
  if (
    data.documentPlaceId &&
    !existing.comuni.has(data.documentPlaceId) &&
    !existing.countries.has(data.documentPlaceId)
  ) {
    errors.documentPlaceId = "documentPlaceUnknown";
  }

  return errors;
}
