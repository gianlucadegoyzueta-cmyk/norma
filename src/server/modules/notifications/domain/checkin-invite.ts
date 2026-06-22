// Composizione PURA dei messaggi email di check-in (invito + promemoria), multilingua it/en/de/fr/es.
// Nessun I/O qui: prende i dati del soggiorno e ritorna oggetto/testo/HTML pronti per l'EmailSender.
// Tono Norma: sobrio, niente hype, footer essenziale. Importabile ovunque (testabile).
//
// I contenuti per lingua stanno in ./checkin-invite-content; il layout HTML on-brand in
// ./checkin-invite-html. Qui si orchestrano: sostituzione del placeholder {property}, testo
// semplice (fallback) e HTML.

import {
  CHECKIN_EMAIL_STRINGS,
  type CheckinEmailKind,
  type CheckinEmailStrings,
  DEFAULT_EMAIL_LOCALE,
  EMAIL_LOCALES,
  type EmailLocale,
  isEmailLocale,
} from "./checkin-invite-content";
import { renderCheckinEmailHtml } from "./checkin-invite-html";

export {
  type CheckinEmailKind,
  DEFAULT_EMAIL_LOCALE,
  EMAIL_LOCALES,
  type EmailLocale,
  isEmailLocale,
};

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
  /** Corpo in testo semplice (fallback per client che non rendono HTML). */
  text: string;
  /** Corpo HTML on-brand "Carta & Inchiostro" (table-based, stili inline). */
  html: string;
}

function fill(template: string, propertyName: string): string {
  return template.split("{property}").join(propertyName);
}

/** Testo semplice: saluto, corpo, link in chiaro, nota, footer su due righe. */
function renderText(strings: CheckinEmailStrings, body: string, url: string): string {
  return (
    `${strings.greeting}\n\n` +
    `${body}\n\n` +
    `${strings.linkLabel}\n${url}\n\n` +
    `${strings.note}\n\n` +
    `${strings.footerSignature}\n${strings.footerTagline}`
  );
}

/** Compone subject + testo + HTML dell'email di check-in. Funzione pura: stesso input → stesso output. */
export function composeCheckinEmail(input: CheckinEmailInput): ComposedEmail {
  const locale: EmailLocale = isEmailLocale(input.locale) ? input.locale : DEFAULT_EMAIL_LOCALE;
  const strings = CHECKIN_EMAIL_STRINGS[locale][input.kind];

  const subject = fill(strings.subject, input.propertyName);
  const body = fill(strings.body, input.propertyName);

  return {
    subject,
    text: renderText(strings, body, input.checkinUrl),
    html: renderCheckinEmailHtml({
      strings,
      subject,
      body,
      checkinUrl: input.checkinUrl,
      lang: locale,
    }),
  };
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
