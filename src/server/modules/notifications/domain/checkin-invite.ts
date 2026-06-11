// Composizione PURA dei messaggi email di check-in (invito + promemoria), IT ed EN.
// Nessun I/O qui: prende i dati del soggiorno e ritorna oggetto/testo pronti per l'EmailSender.
// Tono Norma: sobrio, niente hype, footer essenziale. Importabile ovunque (testabile).

/** Tipo di email: primo invito o gentile promemoria (arrivo vicino, check-in non completato). */
export type CheckinEmailKind = "invite" | "reminder";

/** Lingue supportate per le email transazionali ospite. (Le altre lingue restano sul form pubblico.) */
export const EMAIL_LOCALES = ["it", "en"] as const;
export type EmailLocale = (typeof EMAIL_LOCALES)[number];
export const DEFAULT_EMAIL_LOCALE: EmailLocale = "it";

export function isEmailLocale(x: string | undefined): x is EmailLocale {
  return !!x && (EMAIL_LOCALES as readonly string[]).includes(x);
}

export interface CheckinEmailInput {
  kind: CheckinEmailKind;
  locale: EmailLocale;
  /** Nome dell'immobile, mostrato all'ospite. */
  propertyName: string;
  /** URL pubblico completo del check-in (token in chiaro già incluso). */
  checkinUrl: string;
}

export interface ComposedEmail {
  subject: string;
  text: string;
}

const FOOTER: Record<EmailLocale, string> = {
  it: "— Norma, per conto del tuo host\nCompliance per affitti brevi · norma.casa",
  en: "— Norma, on behalf of your host\nCompliance for short-term rentals · norma.casa",
};

type Template = (propertyName: string, url: string) => ComposedEmail;

const TEMPLATES: Record<EmailLocale, Record<CheckinEmailKind, Template>> = {
  it: {
    invite: (property, url) => ({
      subject: `Completa il check-in per il tuo soggiorno a ${property}`,
      text:
        `Benvenuto,\n\n` +
        `per il tuo soggiorno a ${property} ti chiediamo di completare il check-in online: ` +
        `bastano due minuti e ti evita formalità all'arrivo.\n\n` +
        `Completa qui:\n${url}\n\n` +
        `Il link è personale: non condividerlo. Se hai già completato il check-in, ignora questo messaggio.\n\n` +
        FOOTER.it,
    }),
    reminder: (property, url) => ({
      subject: `Promemoria: completa il check-in per ${property}`,
      text:
        `Ciao,\n\n` +
        `manca poco al tuo arrivo a ${property} e non risulta ancora completato il check-in online. ` +
        `Quando hai un minuto, completalo qui:\n${url}\n\n` +
        `Bastano due minuti. Se lo hai già fatto, ignora pure questo messaggio.\n\n` +
        FOOTER.it,
    }),
  },
  en: {
    invite: (property, url) => ({
      subject: `Complete the check-in for your stay at ${property}`,
      text:
        `Welcome,\n\n` +
        `for your stay at ${property}, please complete the online check-in: ` +
        `it only takes two minutes and saves you formalities on arrival.\n\n` +
        `Complete it here:\n${url}\n\n` +
        `This link is personal — please don't share it. If you've already checked in, ignore this message.\n\n` +
        FOOTER.en,
    }),
    reminder: (property, url) => ({
      subject: `Reminder: complete the check-in for ${property}`,
      text:
        `Hi,\n\n` +
        `your arrival at ${property} is coming up and the online check-in isn't completed yet. ` +
        `When you have a minute, complete it here:\n${url}\n\n` +
        `It only takes two minutes. If you've already done it, please ignore this message.\n\n` +
        FOOTER.en,
    }),
  },
};

/** Compone subject + testo dell'email di check-in. Funzione pura: stesso input → stesso output. */
export function composeCheckinEmail(input: CheckinEmailInput): ComposedEmail {
  return TEMPLATES[input.locale][input.kind](input.propertyName, input.checkinUrl);
}

/**
 * Decide se l'email è un primo invito o un promemoria, in base alla vicinanza dell'arrivo.
 * Promemoria se l'arrivo è entro 72h (e non nel passato remoto): puro, niente accesso al DB.
 */
const REMINDER_WINDOW_MS = 1000 * 60 * 60 * 72;

export function chooseCheckinEmailKind(
  arrivalDate: Date,
  now: number = Date.now(),
): CheckinEmailKind {
  const ms = arrivalDate.getTime() - now;
  return ms <= REMINDER_WINDOW_MS ? "reminder" : "invite";
}

/** Validazione minima e pragmatica di un indirizzo email (no PII nei log: solo booleano). */
export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
