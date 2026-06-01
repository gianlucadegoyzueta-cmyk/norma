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
  documentTypeId?: string;
  documentNumber?: string;
  documentPlaceId?: string;
}

export interface PersonValidation {
  data: GuestData | null;
  errors: Record<string, string>;
}

function clean(v?: string): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

export function validatePerson(input: PersonInput, withDocument: boolean): PersonValidation {
  const errors: Record<string, string> = {};

  const lastName = clean(input.lastName);
  const firstName = clean(input.firstName);
  if (!lastName) errors.lastName = "Il cognome è obbligatorio.";
  if (!firstName) errors.firstName = "Il nome è obbligatorio.";

  const sex = clean(input.sex);
  if (sex !== "M" && sex !== "F") errors.sex = "Seleziona il sesso.";

  const birthDateRaw = clean(input.birthDate);
  const birthDate = birthDateRaw ? new Date(`${birthDateRaw}T12:00:00.000Z`) : null;
  if (!birthDate || Number.isNaN(birthDate.getTime())) {
    errors.birthDate = "Indica una data di nascita valida.";
  }

  const birthCountryId = clean(input.birthCountryId);
  if (!birthCountryId) errors.birthCountryId = "Lo stato di nascita è obbligatorio.";

  const citizenshipId = clean(input.citizenshipId);
  if (!citizenshipId) errors.citizenshipId = "La cittadinanza è obbligatoria.";

  if (Object.keys(errors).length > 0) return { data: null, errors };

  return {
    data: {
      firstName: firstName as string,
      lastName: lastName as string,
      sex: sex as Sex,
      birthDate: birthDate as Date,
      birthCountryId: birthCountryId as string,
      citizenshipId: citizenshipId as string,
      birthComuneId: clean(input.birthComuneId) ?? null,
      documentTypeId: withDocument ? (clean(input.documentTypeId) ?? null) : null,
      documentNumber: withDocument ? (clean(input.documentNumber) ?? null) : null,
      documentPlaceId: withDocument ? (clean(input.documentPlaceId) ?? null) : null,
    },
    errors: {},
  };
}
