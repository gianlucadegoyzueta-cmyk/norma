// Contenuti TESTUALI multilingua delle email di check-in (invito + promemoria), per lingua.
// PURO, nessun I/O: definisce solo le stringhe. Il layout (testo semplice e HTML) le compone altrove.
//
// Lingue allineate al check-in pubblico (src/server/modules/checkin/messages.ts): it/en/de/fr/es.
// Tono Norma: sobrio, niente hype. Verità editoriale: "Norma prepara, tu confermi" — mai "invia da sola".

/** Tipo di email: primo invito o gentile promemoria (arrivo vicino, check-in non completato). */
export type CheckinEmailKind = "invite" | "reminder";

/** Lingue supportate per le email transazionali ospite (allineate al form pubblico di check-in). */
export const EMAIL_LOCALES = ["it", "en", "de", "fr", "es"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];
export const DEFAULT_EMAIL_LOCALE: EmailLocale = "it";

export function isEmailLocale(x: string | undefined): x is EmailLocale {
  return !!x && (EMAIL_LOCALES as readonly string[]).includes(x);
}

/** Stringhe di una singola email, con `{property}` come unico placeholder testuale (mai il link inline). */
export interface CheckinEmailStrings {
  /** Oggetto dell'email. Contiene `{property}`. */
  subject: string;
  /** Saluto di apertura (es. "Benvenuto,"). */
  greeting: string;
  /** Corpo principale. Contiene `{property}`. */
  body: string;
  /** Etichetta del pulsante / call-to-action. */
  cta: string;
  /** Riga che precede il link in chiaro (fallback per chi non vede il bottone). */
  linkLabel: string;
  /** Nota sulla personalità del link + invito a ignorare se già completato. */
  note: string;
  /** Footer: prima riga (firma). */
  footerSignature: string;
  /** Footer: seconda riga (tagline + dominio). */
  footerTagline: string;
}

/** Tutte le stringhe per lingua e tipo. Nessun valore può essere vuoto (verificato nei test). */
export const CHECKIN_EMAIL_STRINGS: Record<
  EmailLocale,
  Record<CheckinEmailKind, CheckinEmailStrings>
> = {
  it: {
    invite: {
      subject: "Completa il check-in per il tuo soggiorno a {property}",
      greeting: "Benvenuto,",
      body:
        "per il tuo soggiorno a {property} ti chiediamo di completare il check-in online: " +
        "bastano due minuti e ti evita formalità all'arrivo.",
      cta: "Completa il check-in",
      linkLabel: "Oppure copia questo link nel browser:",
      note: "Il link è personale: non condividerlo. Se hai già completato il check-in, ignora questo messaggio.",
      footerSignature: "— Norma, per conto del tuo host",
      footerTagline: "Compliance per affitti brevi · norma.casa",
    },
    reminder: {
      subject: "Promemoria: completa il check-in per {property}",
      greeting: "Ciao,",
      body:
        "manca poco al tuo arrivo a {property} e non risulta ancora completato il check-in online. " +
        "Quando hai un minuto, completalo qui.",
      cta: "Completa il check-in",
      linkLabel: "Oppure copia questo link nel browser:",
      note: "Bastano due minuti. Se lo hai già fatto, ignora pure questo messaggio.",
      footerSignature: "— Norma, per conto del tuo host",
      footerTagline: "Compliance per affitti brevi · norma.casa",
    },
  },
  en: {
    invite: {
      subject: "Complete the check-in for your stay at {property}",
      greeting: "Welcome,",
      body:
        "for your stay at {property}, please complete the online check-in: " +
        "it only takes two minutes and saves you formalities on arrival.",
      cta: "Complete the check-in",
      linkLabel: "Or copy this link into your browser:",
      note: "This link is personal — please don't share it. If you've already checked in, ignore this message.",
      footerSignature: "— Norma, on behalf of your host",
      footerTagline: "Compliance for short-term rentals · norma.casa",
    },
    reminder: {
      subject: "Reminder: complete the check-in for {property}",
      greeting: "Hi,",
      body:
        "your arrival at {property} is coming up and the online check-in isn't completed yet. " +
        "When you have a minute, complete it here.",
      cta: "Complete the check-in",
      linkLabel: "Or copy this link into your browser:",
      note: "It only takes two minutes. If you've already done it, please ignore this message.",
      footerSignature: "— Norma, on behalf of your host",
      footerTagline: "Compliance for short-term rentals · norma.casa",
    },
  },
  de: {
    invite: {
      subject: "Schließen Sie den Check-in für Ihren Aufenthalt in {property} ab",
      greeting: "Willkommen,",
      body:
        "für Ihren Aufenthalt in {property} bitten wir Sie, den Online-Check-in abzuschließen: " +
        "Es dauert nur zwei Minuten und erspart Ihnen Formalitäten bei der Ankunft.",
      cta: "Check-in abschließen",
      linkLabel: "Oder kopieren Sie diesen Link in Ihren Browser:",
      note: "Der Link ist persönlich — bitte teilen Sie ihn nicht. Wenn Sie den Check-in bereits abgeschlossen haben, ignorieren Sie diese Nachricht.",
      footerSignature: "— Norma, im Auftrag Ihres Gastgebers",
      footerTagline: "Compliance für Kurzzeitvermietungen · norma.casa",
    },
    reminder: {
      subject: "Erinnerung: Schließen Sie den Check-in für {property} ab",
      greeting: "Hallo,",
      body:
        "Ihre Ankunft in {property} steht bevor und der Online-Check-in ist noch nicht abgeschlossen. " +
        "Schließen Sie ihn ab, sobald Sie eine Minute Zeit haben.",
      cta: "Check-in abschließen",
      linkLabel: "Oder kopieren Sie diesen Link in Ihren Browser:",
      note: "Es dauert nur zwei Minuten. Wenn Sie es bereits getan haben, ignorieren Sie diese Nachricht.",
      footerSignature: "— Norma, im Auftrag Ihres Gastgebers",
      footerTagline: "Compliance für Kurzzeitvermietungen · norma.casa",
    },
  },
  fr: {
    invite: {
      subject: "Finalisez l'enregistrement pour votre séjour à {property}",
      greeting: "Bienvenue,",
      body:
        "pour votre séjour à {property}, merci de finaliser l'enregistrement en ligne : " +
        "cela ne prend que deux minutes et vous évite des formalités à l'arrivée.",
      cta: "Finaliser l'enregistrement",
      linkLabel: "Ou copiez ce lien dans votre navigateur :",
      note: "Ce lien est personnel — merci de ne pas le partager. Si vous avez déjà fait l'enregistrement, ignorez ce message.",
      footerSignature: "— Norma, pour le compte de votre hôte",
      footerTagline: "Conformité pour les locations de courte durée · norma.casa",
    },
    reminder: {
      subject: "Rappel : finalisez l'enregistrement pour {property}",
      greeting: "Bonjour,",
      body:
        "votre arrivée à {property} approche et l'enregistrement en ligne n'est pas encore terminé. " +
        "Dès que vous avez une minute, finalisez-le ici.",
      cta: "Finaliser l'enregistrement",
      linkLabel: "Ou copiez ce lien dans votre navigateur :",
      note: "Cela ne prend que deux minutes. Si vous l'avez déjà fait, ignorez ce message.",
      footerSignature: "— Norma, pour le compte de votre hôte",
      footerTagline: "Conformité pour les locations de courte durée · norma.casa",
    },
  },
  es: {
    invite: {
      subject: "Completa el check-in para tu estancia en {property}",
      greeting: "Bienvenido,",
      body:
        "para tu estancia en {property}, te pedimos que completes el check-in online: " +
        "solo dos minutos y te evita trámites a la llegada.",
      cta: "Completar el check-in",
      linkLabel: "O copia este enlace en tu navegador:",
      note: "El enlace es personal: no lo compartas. Si ya has hecho el check-in, ignora este mensaje.",
      footerSignature: "— Norma, en nombre de tu anfitrión",
      footerTagline: "Cumplimiento para alquileres de corta duración · norma.casa",
    },
    reminder: {
      subject: "Recordatorio: completa el check-in para {property}",
      greeting: "Hola,",
      body:
        "tu llegada a {property} está cerca y el check-in online aún no está completado. " +
        "Cuando tengas un minuto, complétalo aquí.",
      cta: "Completar el check-in",
      linkLabel: "O copia este enlace en tu navegador:",
      note: "Solo dos minutos. Si ya lo has hecho, ignora este mensaje.",
      footerSignature: "— Norma, en nombre de tu anfitrión",
      footerTagline: "Cumplimiento para alquileres de corta duración · norma.casa",
    },
  },
};
