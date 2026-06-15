// i18n del check-in ospite (volto verso il cliente). Dizionario in-house leggero (niente librerie):
// la pagina pubblica è autocontenuta, la lingua si sceglie con ?lang=. PURO (importabile ovunque).

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
  submit: string;
  submitting: string;
  successTitle: string;
  successBody: string;
  addAnother: string;
  invalidTitle: string;
  invalidBody: string;
  errorGeneric: string;
}

export const MESSAGES: Record<Locale, CheckinMessages> = {
  it: {
    title: "Check-in online",
    intro: "Inserisci i tuoi dati per il soggiorno. Bastano due minuti.",
    privacy:
      "I dati servono solo alla comunicazione obbligatoria alla Polizia di Stato. Nessuna foto del documento viene conservata.",
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
    submit: "Invia il check-in",
    submitting: "Invio…",
    successTitle: "Check-in completato",
    successBody: "Grazie! I tuoi dati sono stati inviati al tuo host. Buon soggiorno.",
    addAnother: "Aggiungi un'altra persona",
    invalidTitle: "Link non valido",
    invalidBody:
      "Questo link di check-in non è valido o è scaduto. Chiedi al tuo host un nuovo link.",
    errorGeneric: "Controlla i campi e riprova.",
  },
  en: {
    title: "Online check-in",
    intro: "Enter your details for your stay. It only takes two minutes.",
    privacy:
      "Your data is used only for the mandatory report to the Italian State Police. No document photo is stored.",
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
    submit: "Submit check-in",
    submitting: "Submitting…",
    successTitle: "Check-in completed",
    successBody: "Thank you! Your details have been sent to your host. Enjoy your stay.",
    addAnother: "Add another person",
    invalidTitle: "Invalid link",
    invalidBody: "This check-in link is invalid or has expired. Ask your host for a new link.",
    errorGeneric: "Please check the fields and try again.",
  },
  de: {
    title: "Online-Check-in",
    intro: "Geben Sie Ihre Daten für den Aufenthalt ein. Es dauert nur zwei Minuten.",
    privacy:
      "Ihre Daten werden nur für die Pflichtmeldung an die italienische Staatspolizei verwendet. Es wird kein Ausweisfoto gespeichert.",
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
    submit: "Check-in absenden",
    submitting: "Senden…",
    successTitle: "Check-in abgeschlossen",
    successBody: "Danke! Ihre Daten wurden an Ihren Gastgeber gesendet. Schönen Aufenthalt.",
    addAnother: "Weitere Person hinzufügen",
    invalidTitle: "Ungültiger Link",
    invalidBody:
      "Dieser Check-in-Link ist ungültig oder abgelaufen. Bitten Sie Ihren Gastgeber um einen neuen Link.",
    errorGeneric: "Bitte überprüfen Sie die Felder und versuchen Sie es erneut.",
  },
  fr: {
    title: "Enregistrement en ligne",
    intro: "Saisissez vos informations pour le séjour. Cela ne prend que deux minutes.",
    privacy:
      "Vos données servent uniquement à la déclaration obligatoire à la Police d'État italienne. Aucune photo du document n'est conservée.",
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
    submit: "Envoyer l'enregistrement",
    submitting: "Envoi…",
    successTitle: "Enregistrement terminé",
    successBody: "Merci ! Vos informations ont été envoyées à votre hôte. Bon séjour.",
    addAnother: "Ajouter une autre personne",
    invalidTitle: "Lien non valide",
    invalidBody:
      "Ce lien d'enregistrement n'est pas valide ou a expiré. Demandez un nouveau lien à votre hôte.",
    errorGeneric: "Veuillez vérifier les champs et réessayer.",
  },
  es: {
    title: "Check-in online",
    intro: "Introduce tus datos para la estancia. Solo dos minutos.",
    privacy:
      "Tus datos se usan solo para la comunicación obligatoria a la Policía del Estado italiano. No se conserva ninguna foto del documento.",
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
    submit: "Enviar el check-in",
    submitting: "Enviando…",
    successTitle: "Check-in completado",
    successBody: "¡Gracias! Tus datos se han enviado a tu anfitrión. Feliz estancia.",
    addAnother: "Añadir otra persona",
    invalidTitle: "Enlace no válido",
    invalidBody:
      "Este enlace de check-in no es válido o ha caducado. Pide a tu anfitrión un nuevo enlace.",
    errorGeneric: "Revisa los campos e inténtalo de nuevo.",
  },
};
