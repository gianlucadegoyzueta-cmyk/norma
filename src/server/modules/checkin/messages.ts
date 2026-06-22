// i18n del check-in ospite (volto verso il cliente). Dizionario in-house leggero (niente librerie):
// la pagina pubblica è autocontenuta, la lingua si sceglie con ?lang=. PURO (importabile ovunque).

import type { PersonErrorCode } from "@/app/stays/guest-validation";

export const LOCALES = ["it", "en", "de", "fr", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "it";

export function isLocale(x: string | undefined): x is Locale {
  return !!x && (LOCALES as readonly string[]).includes(x);
}

/** Nomi delle lingue (nella propria lingua) per il selettore. */
export const LANG_NAMES: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

export interface CheckinMessages {
  title: string;
  intro: string;
  privacy: string;
  /** Intestazioni di sezione: spezzano il modulo in blocchi leggibili (chi sei / documento / residenza / viaggio). */
  sectionIdentity: string;
  sectionDocument: string;
  sectionResidence: string;
  sectionTrip: string;
  sectionResidenceHint: string;
  sectionTripHint: string;
  lastName: string;
  firstName: string;
  sex: string;
  sexM: string;
  sexF: string;
  birthDate: string;
  birthCountry: string;
  birthComune: string;
  citizenship: string;
  documentType: string;
  documentNumber: string;
  documentPlace: string;
  residenceCountry: string;
  residenceComune: string;
  residenceForeignLocality: string;
  tourismType: string;
  transportMeans: string;
  select: string;
  optional: string;
  ifItaly: string;
  required: string;
  /** ComboBox (comune/luogo): nessun risultato + invito a scegliere una voce dall'elenco. */
  comboNoMatch: string;
  comboPickFromList: string;
  comboMore: string;
  submit: string;
  submitting: string;
  /** Banner riepilogo errori dopo un submit fallito (porta l'ospite ai campi da correggere). */
  fixErrors: string;
  successTitle: string;
  successBody: string;
  addAnother: string;
  invalidTitle: string;
  invalidBody: string;
  errorGeneric: string;
  /** Errori per-campo, indicizzati dai codici stabili di `validatePerson`. */
  fieldErrors: Record<PersonErrorCode, string>;
}

export const MESSAGES: Record<Locale, CheckinMessages> = {
  it: {
    title: "Check-in online",
    intro: "Inserisci i tuoi dati per il soggiorno. Bastano due minuti.",
    privacy:
      "I dati servono solo alla comunicazione obbligatoria alla Polizia di Stato. Nessuna foto del documento viene conservata.",
    sectionIdentity: "I tuoi dati",
    sectionDocument: "Documento",
    sectionResidence: "Residenza",
    sectionTrip: "Il tuo viaggio",
    sectionResidenceHint: "Facoltativa: aiuta gli adempimenti sul turismo.",
    sectionTripHint: "Facoltativo.",
    lastName: "Cognome",
    firstName: "Nome",
    sex: "Sesso",
    sexM: "Maschile",
    sexF: "Femminile",
    birthDate: "Data di nascita",
    birthCountry: "Stato di nascita",
    birthComune: "Comune di nascita",
    citizenship: "Cittadinanza",
    documentType: "Tipo di documento",
    documentNumber: "Numero del documento",
    documentPlace: "Luogo di rilascio",
    residenceCountry: "Stato di residenza",
    residenceComune: "Comune di residenza",
    residenceForeignLocality: "Località di residenza (estero)",
    tourismType: "Tipo di turismo",
    transportMeans: "Mezzo di trasporto",
    select: "Seleziona",
    optional: "facoltativo",
    ifItaly: "solo se in Italia",
    required: "obbligatorio",
    comboNoMatch: "Nessuna corrispondenza",
    comboPickFromList: "Seleziona una voce dall'elenco.",
    comboMore: "Affina la ricerca per restringere l'elenco.",
    submit: "Invia il check-in",
    submitting: "Invio…",
    fixErrors: "Controlla i campi evidenziati e riprova.",
    successTitle: "Check-in completato",
    successBody: "Grazie! I tuoi dati sono stati inviati al tuo host. Buon soggiorno.",
    addAnother: "Aggiungi un'altra persona",
    invalidTitle: "Link non valido",
    invalidBody:
      "Questo link di check-in non è valido o è scaduto. Chiedi al tuo host un nuovo link.",
    errorGeneric: "Controlla i campi e riprova.",
    fieldErrors: {
      lastNameRequired: "Il cognome è obbligatorio.",
      firstNameRequired: "Il nome è obbligatorio.",
      sexRequired: "Seleziona il sesso.",
      birthDateInvalid: "Indica una data di nascita valida.",
      birthCountryRequired: "Lo stato di nascita è obbligatorio.",
      citizenshipRequired: "La cittadinanza è obbligatoria.",
      documentTypeRequired: "Il tipo di documento è obbligatorio.",
      documentNumberRequired: "Il numero del documento è obbligatorio.",
      documentPlaceRequired: "Il luogo di rilascio è obbligatorio.",
    },
  },
  en: {
    title: "Online check-in",
    intro: "Enter your details for your stay. It only takes two minutes.",
    privacy:
      "Your data is used only for the mandatory report to the Italian State Police. No document photo is stored.",
    sectionIdentity: "Your details",
    sectionDocument: "Document",
    sectionResidence: "Residence",
    sectionTrip: "Your trip",
    sectionResidenceHint: "Optional: helps with tourism reporting.",
    sectionTripHint: "Optional.",
    lastName: "Surname",
    firstName: "First name",
    sex: "Sex",
    sexM: "Male",
    sexF: "Female",
    birthDate: "Date of birth",
    birthCountry: "Country of birth",
    birthComune: "Municipality of birth",
    citizenship: "Citizenship",
    documentType: "Document type",
    documentNumber: "Document number",
    documentPlace: "Place of issue",
    residenceCountry: "Country of residence",
    residenceComune: "Municipality of residence",
    residenceForeignLocality: "Place of residence (abroad)",
    tourismType: "Type of tourism",
    transportMeans: "Means of transport",
    select: "Select",
    optional: "optional",
    ifItaly: "only if in Italy",
    required: "required",
    comboNoMatch: "No matches",
    comboPickFromList: "Pick an entry from the list.",
    comboMore: "Refine your search to narrow the list.",
    submit: "Submit check-in",
    submitting: "Submitting…",
    fixErrors: "Please check the highlighted fields and try again.",
    successTitle: "Check-in completed",
    successBody: "Thank you! Your details have been sent to your host. Enjoy your stay.",
    addAnother: "Add another person",
    invalidTitle: "Invalid link",
    invalidBody: "This check-in link is invalid or has expired. Ask your host for a new link.",
    errorGeneric: "Please check the fields and try again.",
    fieldErrors: {
      lastNameRequired: "Surname is required.",
      firstNameRequired: "First name is required.",
      sexRequired: "Please select your sex.",
      birthDateInvalid: "Please enter a valid date of birth.",
      birthCountryRequired: "Country of birth is required.",
      citizenshipRequired: "Citizenship is required.",
      documentTypeRequired: "Document type is required.",
      documentNumberRequired: "Document number is required.",
      documentPlaceRequired: "Place of issue is required.",
    },
  },
  de: {
    title: "Online-Check-in",
    intro: "Geben Sie Ihre Daten für den Aufenthalt ein. Es dauert nur zwei Minuten.",
    privacy:
      "Ihre Daten werden nur für die Pflichtmeldung an die italienische Staatspolizei verwendet. Es wird kein Ausweisfoto gespeichert.",
    sectionIdentity: "Ihre Daten",
    sectionDocument: "Dokument",
    sectionResidence: "Wohnsitz",
    sectionTrip: "Ihre Reise",
    sectionResidenceHint: "Optional: hilft bei der Tourismusmeldung.",
    sectionTripHint: "Optional.",
    lastName: "Nachname",
    firstName: "Vorname",
    sex: "Geschlecht",
    sexM: "Männlich",
    sexF: "Weiblich",
    birthDate: "Geburtsdatum",
    birthCountry: "Geburtsland",
    birthComune: "Geburtsgemeinde",
    citizenship: "Staatsangehörigkeit",
    documentType: "Dokumententyp",
    documentNumber: "Dokumentennummer",
    documentPlace: "Ausstellungsort",
    residenceCountry: "Wohnsitzland",
    residenceComune: "Wohnsitzgemeinde",
    residenceForeignLocality: "Wohnort (Ausland)",
    tourismType: "Reiseart",
    transportMeans: "Verkehrsmittel",
    select: "Auswählen",
    optional: "optional",
    ifItaly: "nur wenn in Italien",
    required: "erforderlich",
    comboNoMatch: "Keine Treffer",
    comboPickFromList: "Bitte einen Eintrag aus der Liste wählen.",
    comboMore: "Verfeinern Sie die Suche, um die Liste einzugrenzen.",
    submit: "Check-in absenden",
    submitting: "Senden…",
    fixErrors: "Bitte prüfen Sie die markierten Felder und versuchen Sie es erneut.",
    successTitle: "Check-in abgeschlossen",
    successBody: "Danke! Ihre Daten wurden an Ihren Gastgeber gesendet. Schönen Aufenthalt.",
    addAnother: "Weitere Person hinzufügen",
    invalidTitle: "Ungültiger Link",
    invalidBody:
      "Dieser Check-in-Link ist ungültig oder abgelaufen. Bitten Sie Ihren Gastgeber um einen neuen Link.",
    errorGeneric: "Bitte überprüfen Sie die Felder und versuchen Sie es erneut.",
    fieldErrors: {
      lastNameRequired: "Der Nachname ist erforderlich.",
      firstNameRequired: "Der Vorname ist erforderlich.",
      sexRequired: "Bitte Geschlecht auswählen.",
      birthDateInvalid: "Bitte ein gültiges Geburtsdatum angeben.",
      birthCountryRequired: "Das Geburtsland ist erforderlich.",
      citizenshipRequired: "Die Staatsangehörigkeit ist erforderlich.",
      documentTypeRequired: "Der Dokumententyp ist erforderlich.",
      documentNumberRequired: "Die Dokumentennummer ist erforderlich.",
      documentPlaceRequired: "Der Ausstellungsort ist erforderlich.",
    },
  },
  fr: {
    title: "Enregistrement en ligne",
    intro: "Saisissez vos informations pour le séjour. Cela ne prend que deux minutes.",
    privacy:
      "Vos données servent uniquement à la déclaration obligatoire à la Police d'État italienne. Aucune photo du document n'est conservée.",
    sectionIdentity: "Vos informations",
    sectionDocument: "Document",
    sectionResidence: "Résidence",
    sectionTrip: "Votre voyage",
    sectionResidenceHint: "Facultatif : utile pour les déclarations touristiques.",
    sectionTripHint: "Facultatif.",
    lastName: "Nom",
    firstName: "Prénom",
    sex: "Sexe",
    sexM: "Masculin",
    sexF: "Féminin",
    birthDate: "Date de naissance",
    birthCountry: "Pays de naissance",
    birthComune: "Commune de naissance",
    citizenship: "Nationalité",
    documentType: "Type de document",
    documentNumber: "Numéro du document",
    documentPlace: "Lieu de délivrance",
    residenceCountry: "Pays de résidence",
    residenceComune: "Commune de résidence",
    residenceForeignLocality: "Lieu de résidence (étranger)",
    tourismType: "Type de tourisme",
    transportMeans: "Moyen de transport",
    select: "Sélectionner",
    optional: "facultatif",
    ifItaly: "uniquement si en Italie",
    required: "obligatoire",
    comboNoMatch: "Aucune correspondance",
    comboPickFromList: "Choisissez une entrée dans la liste.",
    comboMore: "Affinez la recherche pour réduire la liste.",
    submit: "Envoyer l'enregistrement",
    submitting: "Envoi…",
    fixErrors: "Veuillez vérifier les champs en surbrillance et réessayer.",
    successTitle: "Enregistrement terminé",
    successBody: "Merci ! Vos informations ont été envoyées à votre hôte. Bon séjour.",
    addAnother: "Ajouter une autre personne",
    invalidTitle: "Lien non valide",
    invalidBody:
      "Ce lien d'enregistrement n'est pas valide ou a expiré. Demandez un nouveau lien à votre hôte.",
    errorGeneric: "Veuillez vérifier les champs et réessayer.",
    fieldErrors: {
      lastNameRequired: "Le nom est obligatoire.",
      firstNameRequired: "Le prénom est obligatoire.",
      sexRequired: "Veuillez sélectionner le sexe.",
      birthDateInvalid: "Veuillez indiquer une date de naissance valide.",
      birthCountryRequired: "Le pays de naissance est obligatoire.",
      citizenshipRequired: "La nationalité est obligatoire.",
      documentTypeRequired: "Le type de document est obligatoire.",
      documentNumberRequired: "Le numéro du document est obligatoire.",
      documentPlaceRequired: "Le lieu de délivrance est obligatoire.",
    },
  },
  es: {
    title: "Check-in online",
    intro: "Introduce tus datos para la estancia. Solo dos minutos.",
    privacy:
      "Tus datos se usan solo para la comunicación obligatoria a la Policía del Estado italiano. No se conserva ninguna foto del documento.",
    sectionIdentity: "Tus datos",
    sectionDocument: "Documento",
    sectionResidence: "Residencia",
    sectionTrip: "Tu viaje",
    sectionResidenceHint: "Opcional: ayuda con los trámites de turismo.",
    sectionTripHint: "Opcional.",
    lastName: "Apellido",
    firstName: "Nombre",
    sex: "Sexo",
    sexM: "Masculino",
    sexF: "Femenino",
    birthDate: "Fecha de nacimiento",
    birthCountry: "País de nacimiento",
    birthComune: "Municipio de nacimiento",
    citizenship: "Nacionalidad",
    documentType: "Tipo de documento",
    documentNumber: "Número del documento",
    documentPlace: "Lugar de expedición",
    residenceCountry: "País de residencia",
    residenceComune: "Municipio de residencia",
    residenceForeignLocality: "Localidad de residencia (extranjero)",
    tourismType: "Tipo de turismo",
    transportMeans: "Medio de transporte",
    select: "Seleccionar",
    optional: "opcional",
    ifItaly: "solo si está en Italia",
    required: "obligatorio",
    comboNoMatch: "Sin coincidencias",
    comboPickFromList: "Elige una opción de la lista.",
    comboMore: "Afina la búsqueda para reducir la lista.",
    submit: "Enviar el check-in",
    submitting: "Enviando…",
    fixErrors: "Revisa los campos resaltados e inténtalo de nuevo.",
    successTitle: "Check-in completado",
    successBody: "¡Gracias! Tus datos se han enviado a tu anfitrión. Feliz estancia.",
    addAnother: "Añadir otra persona",
    invalidTitle: "Enlace no válido",
    invalidBody:
      "Este enlace de check-in no es válido o ha caducado. Pide a tu anfitrión un nuevo enlace.",
    errorGeneric: "Revisa los campos e inténtalo de nuevo.",
    fieldErrors: {
      lastNameRequired: "El apellido es obligatorio.",
      firstNameRequired: "El nombre es obligatorio.",
      sexRequired: "Selecciona el sexo.",
      birthDateInvalid: "Indica una fecha de nacimiento válida.",
      birthCountryRequired: "El país de nacimiento es obligatorio.",
      citizenshipRequired: "La nacionalidad es obligatoria.",
      documentTypeRequired: "El tipo de documento es obligatorio.",
      documentNumberRequired: "El número del documento es obligatorio.",
      documentPlaceRequired: "El lugar de expedición es obligatorio.",
    },
  },
};
