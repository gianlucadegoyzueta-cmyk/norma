// Servizio del digest settimanale: per OGNI organizzazione raccoglie i conteggi, compone l'email
// (dominio puro) e la spedisce ai destinatari. RESILIENTE: un errore su un'org/destinatario non
// ferma gli altri né fa esplodere il cron (stesso principio del cron-runner Alloggiati).
//
// ⚠️ Questo servizio INVIA EMAIL REALI. La decisione di accenderlo è del founder: il gating
// (flag DIGEST_ENABLED OFF di default + auth del cron) sta a monte, nella route. Qui c'è solo il
// "cosa fa" quando è stato deciso di girare.

import type { EmailSender } from "../../notifications";
import { composeWeeklyDigestEmail } from "../domain/weekly-digest";
import type { DigestRepository, WeekWindow } from "../ports";

/** Esito per singola organizzazione (per il report del cron). */
export interface OrgDigestOutcome {
  organizationId: string;
  /** Email effettivamente inviate. */
  sent: number;
  /** Errori incontrati (per destinatario o nella raccolta dati). */
  errors: { stage: "gather" | "send"; message: string }[];
}

export interface DigestRunReport {
  weekStartIso: string;
  weekEndIso: string;
  organizations: number;
  /** Totale email inviate su tutte le org. */
  sent: number;
  /** Org con almeno un errore. */
  failed: number;
  outcomes: OrgDigestOutcome[];
}

export class WeeklyDigestService {
  constructor(
    private readonly repo: DigestRepository,
    private readonly email: EmailSender,
  ) {}

  async run(window: WeekWindow): Promise<DigestRunReport> {
    const weekStartIso = isoDay(window.start);
    // La finestra è [start, end): l'ultimo giorno incluso è end - 1 giorno.
    const weekEndIso = isoDay(new Date(window.end.getTime() - 24 * 60 * 60 * 1000));

    const targets = await this.repo.listTargets();
    const outcomes: OrgDigestOutcome[] = [];

    for (const target of targets) {
      const outcome: OrgDigestOutcome = {
        organizationId: target.organizationId,
        sent: 0,
        errors: [],
      };

      try {
        const facts = await this.repo.gatherWeekly(target.organizationId, window);
        const composed = composeWeeklyDigestEmail({
          orgName: target.orgName,
          weekStartIso,
          weekEndIso,
          done: facts.done,
          upcoming: facts.upcoming,
          position: facts.position,
        });

        for (const recipient of target.recipients) {
          try {
            await this.email.send({
              to: recipient.email,
              subject: composed.subject,
              text: composed.text,
            });
            outcome.sent += 1;
          } catch (err) {
            outcome.errors.push({ stage: "send", message: messageOf(err) });
          }
        }
      } catch (err) {
        outcome.errors.push({ stage: "gather", message: messageOf(err) });
      }

      outcomes.push(outcome);
    }

    return {
      weekStartIso,
      weekEndIso,
      organizations: targets.length,
      sent: outcomes.reduce((acc, o) => acc + o.sent, 0),
      failed: outcomes.filter((o) => o.errors.length > 0).length,
      outcomes,
    };
  }
}

/** "YYYY-MM-DD" in UTC (la finestra è costruita in UTC dalla route). */
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
