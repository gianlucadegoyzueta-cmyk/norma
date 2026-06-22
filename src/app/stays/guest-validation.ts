import type { Sex } from "@prisma/client";
import type { GuestData } from "@/server/modules/stays";

/**
 * Validazione PURA di un ospite a partire dai valori grezzi del form. Raccoglie TUTTI gli errori
 * (niente stop al primo), con chiave = nome del campo (es. "lastName"). Isolata dalla server action
 * per essere testabile. La server action si limita a leggere il form e a prefissare le chiavi con
 * l'indice persona (es. "p0.lastName").
 */
export interface PersonInput {
  firstName?: string;
  lastName?: string;
  sex?: string;
  birthDate?: string; // "YYYY-MM-DD"
  birthCountryId?: string;
  citizenshipId?: string;
  birthComuneId?: string;
  residenceCountryId?: string;
  residenceComuneId?: string;
  residenceForeignLocality?: string;
  tourismType?: string;
  transportMeans?: string;
  documentTypeId?: string;
  documentNumber?: string;
  documentPlaceId?: string;
}

/**
 * Codici di errore STABILI per campo, indipendenti dalla lingua. Il flusso autenticato (italiano)
 * li mappa nelle stringhe IT qui sotto; il check-in pubblico li traduce nelle 5 lingue ospite
 * (vedi `src/server/modules/checkin/messages.ts`). Aggiungere un codice = aggiornare entrambe le mappe.
 */
export type PersonErrorCode =
  | "lastNameRequired"
  | "firstNameRequired"
  | "sexRequired"
  | "birthDateInvalid"
  | "birthCountryRequired"
  | "citizenshipRequired"
  | "documentTypeRequired"
  | "documentNumberRequired"
  | "documentPlaceRequired";

/** Etichette IT di default (flusso autenticato + retro-compatibilità test). */
const IT_ERROR_LABELS: Record<PersonErrorCode, string> = {
  lastNameRequired: "Il cognome è obbligatorio.",
  firstNameRequired: "Il nome è obbligatorio.",
  sexRequired: "Seleziona il sesso.",
  birthDateInvalid: "Indica una data di nascita valida.",
  birthCountryRequired: "Lo stato di nascita è obbligatorio.",
  citizenshipRequired: "La cittadinanza è obbligatoria.",
  documentTypeRequired: "Il tipo di documento è obbligatorio.",
  documentNumberRequired: "Il numero del documento è obbligatorio.",
  documentPlaceRequired: "Il luogo di rilascio del documento è obbligatorio.",
};

export interface PersonValidation {
  data: GuestData | null;
  /** Errori già localizzati in italiano (flusso autenticato). Chiave = nome del campo. */
  errors: Record<string, string>;
  /** Codici di errore neutri rispetto alla lingua, per la localizzazione del check-in pubblico. */
  errorCodes: Record<string, PersonErrorCode>;
}

function clean(v?: string): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

export function validatePerson(input: PersonInput, withDocument: boolean): PersonValidation {
  const codes: Record<string, PersonErrorCode> = {};

  const lastName = clean(input.lastName);
  const firstName = clean(input.firstName);
  if (!lastName) codes.lastName = "lastNameRequired";
  if (!firstName) codes.firstName = "firstNameRequired";

  const sex = clean(input.sex);
  if (sex !== "M" && sex !== "F") codes.sex = "sexRequired";

  const birthDateRaw = clean(input.birthDate);
  const birthDate = birthDateRaw ? new Date(`${birthDateRaw}T12:00:00.000Z`) : null;
  if (!birthDate || Number.isNaN(birthDate.getTime())) {
    codes.birthDate = "birthDateInvalid";
  }

  const birthCountryId = clean(input.birthCountryId);
  if (!birthCountryId) codes.birthCountryId = "birthCountryRequired";

  const citizenshipId = clean(input.citizenshipId);
  if (!citizenshipId) codes.citizenshipId = "citizenshipRequired";

  // Documento OBBLIGATORIO quando richiesto (ospite con documento: 16/17/18). Senza, la schedina
  // Alloggiati sarebbe invalida e la dedup-key (basata sul n° documento) diventerebbe fragile:
  // due ospiti distinti senza documento collasserebbero in una sola schedina. Va imposto lato server.
  if (withDocument) {
    if (!clean(input.documentTypeId)) codes.documentTypeId = "documentTypeRequired";
    if (!clean(input.documentNumber)) codes.documentNumber = "documentNumberRequired";
    if (!clean(input.documentPlaceId)) codes.documentPlaceId = "documentPlaceRequired";
  }

  if (Object.keys(codes).length > 0) {
    const errors: Record<string, string> = {};
    for (const [field, code] of Object.entries(codes)) errors[field] = IT_ERROR_LABELS[code];
    return { data: null, errors, errorCodes: codes };
  }

  return {
    data: {
      firstName: firstName as string,
      lastName: lastName as string,
      sex: sex as Sex,
      birthDate: birthDate as Date,
      birthCountryId: birthCountryId as string,
      citizenshipId: citizenshipId as string,
      birthComuneId: clean(input.birthComuneId) ?? null,
      // Residenza: facoltativa (nessun errore se assente), serve a ISTAT/check-in.
      residenceCountryId: clean(input.residenceCountryId) ?? null,
      residenceComuneId: clean(input.residenceComuneId) ?? null,
      residenceForeignLocality: clean(input.residenceForeignLocality) ?? null,
      // Movimento turistico (Ross1000): facoltativi al check-in, obbligatori nel tracciato.
      tourismType: clean(input.tourismType) ?? null,
      transportMeans: clean(input.transportMeans) ?? null,
      documentTypeId: withDocument ? (clean(input.documentTypeId) ?? null) : null,
      documentNumber: withDocument ? (clean(input.documentNumber) ?? null) : null,
      documentPlaceId: withDocument ? (clean(input.documentPlaceId) ?? null) : null,
    },
    errors: {},
    errorCodes: {},
  };
}
