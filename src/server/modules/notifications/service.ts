// SERVIZIO di invio delle email di check-in (invito + promemoria).
// Orchestra: scelta del tipo (in base all'arrivo), composizione multilingua (testo + HTML on-brand),
// invio tramite l'EmailSender iniettato. Nessun accesso al DB qui: i dati del soggiorno arrivano
// dal chiamante (server action). Niente PII nei log (mai l'indirizzo o il contenuto).
//
// Reversibile e gated dal canale: in dev senza RESEND_API_KEY l'adapter degrada a console
// (nessun invio reale). NON è un cron, NON è auto-send: parte solo su richiesta esplicita dell'host.

import {
  chooseCheckinEmailKind,
  type CheckinEmailKind,
  composeCheckinEmail,
  DEFAULT_EMAIL_LOCALE,
  type EmailLocale,
  isEmailLocale,
  isValidEmail,
} from "./domain/checkin-invite";
import type { EmailSender } from "./ports";

export interface SendCheckinInviteInput {
  /** Indirizzo dell'ospite (fornito dall'host: nessuna email è persistita sul soggiorno). */
  to: string;
  /** Nome dell'immobile, mostrato all'ospite. */
  propertyName: string;
  /** URL pubblico completo del check-in (token in chiaro già incluso). */
  checkinUrl: string;
  /** Data di arrivo: decide invito vs promemoria (entro 72h → promemoria). */
  arrivalDate: Date;
  /** Lingua preferita; se non valida si usa il default (it). */
  locale?: string;
  /** Forza il tipo (invito/promemoria); se assente lo decide `arrivalDate`. */
  kind?: CheckinEmailKind;
}

export type SendCheckinInviteResult =
  | { ok: true; kind: CheckinEmailKind; locale: EmailLocale }
  | { ok: false; error: "invalid_email" | "send_failed" };

/**
 * Servizio applicativo: compone e invia l'email di check-in. L'`EmailSender` è iniettato così
 * i test usano un transport finto (nessuna rete) e la produzione usa Resend.
 */
export class CheckinInviteService {
  constructor(private readonly sender: EmailSender) {}

  async send(input: SendCheckinInviteInput): Promise<SendCheckinInviteResult> {
    const to = input.to.trim();
    if (!isValidEmail(to)) return { ok: false, error: "invalid_email" };

    const locale: EmailLocale = isEmailLocale(input.locale) ? input.locale : DEFAULT_EMAIL_LOCALE;
    const kind: CheckinEmailKind = input.kind ?? chooseCheckinEmailKind(input.arrivalDate);

    const composed = composeCheckinEmail({
      kind,
      locale,
      propertyName: input.propertyName,
      checkinUrl: input.checkinUrl,
    });

    try {
      await this.sender.send({
        to,
        subject: composed.subject,
        text: composed.text,
        html: composed.html,
      });
    } catch {
      // Niente PII nel log: nessun indirizzo, nessun contenuto.
      return { ok: false, error: "send_failed" };
    }

    return { ok: true, kind, locale };
  }
}
