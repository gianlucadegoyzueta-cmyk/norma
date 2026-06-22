// Orchestrazione PURA del job notturno "invio + riconciliazione T+1" su TUTTE le credenziali attive.
//
// ⚠️ Questo modulo NON decide se girare: il gating (env flag OFF di default + auth del cron) sta a
// monte, nella route (vedi src/app/api/cron/alloggiati + domain/cron-gate.ts). Qui c'è solo il
// "cosa fa" quando è stato deciso di girare — così è testabile senza Next/rete/DB.
//
// SICUREZZA: un errore su una credenziale NON deve fermare le altre né far esplodere il cron;
// viene catturato e riportato. Nessun re-invio alla cieca: l'invio resta quello dell'outbox
// (PENDING→…, timeout→UNVERIFIED) e la riconciliazione quella per conteggio (vedi D4).

import type { ReconcileResult } from "./reconcile.service";

export interface CronRunnerDeps {
  /** Tutte le credenziali ATTIVE (ogni org). */
  listActiveCredentialIds(): Promise<string[]>;
  /** Invio del batch PENDING di una credenziale (outbox.processCredentialBatch). */
  send(credentialId: string): Promise<void>;
  /** Riconciliazione per conteggio della Ricevuta di `dateIso` (giorno passato). */
  reconcile(credentialId: string, dateIso: string): Promise<ReconcileResult>;
  /** Giorno (ISO) da riconciliare: di norma "ieri" in fuso Europe/Rome. Iniettato per testabilità. */
  reconcileDateIso: string;
}

export interface CronCredentialOutcome {
  credentialId: string;
  /** Esito della riconciliazione, se andata a buon fine. */
  reconcile?: {
    verdict: ReconcileResult["verdict"];
    total: number;
    expected: number;
    reported: number;
  };
  /** Errori per fase (l'una non blocca l'altra né le altre credenziali). */
  errors: { phase: "send" | "reconcile"; message: string }[];
}

export interface CronRunReport {
  reconcileDateIso: string;
  credentials: number;
  /** Numero di credenziali con almeno un errore. */
  failed: number;
  outcomes: CronCredentialOutcome[];
}

/**
 * Esegue invio + riconciliazione su ogni credenziale attiva, in modo resiliente per-credenziale.
 * Sequenziale di proposito: l'invio reale verso la Questura non va parallelizzato a casaccio.
 */
export async function runSendAndReconcile(deps: CronRunnerDeps): Promise<CronRunReport> {
  const ids = await deps.listActiveCredentialIds();
  const outcomes: CronCredentialOutcome[] = [];

  for (const credentialId of ids) {
    const outcome: CronCredentialOutcome = { credentialId, errors: [] };

    try {
      await deps.send(credentialId);
    } catch (err) {
      outcome.errors.push({ phase: "send", message: messageOf(err) });
    }

    try {
      const res = await deps.reconcile(credentialId, deps.reconcileDateIso);
      outcome.reconcile = {
        verdict: res.verdict,
        total: res.total,
        expected: res.expected,
        reported: res.reported,
      };
    } catch (err) {
      outcome.errors.push({ phase: "reconcile", message: messageOf(err) });
    }

    outcomes.push(outcome);
  }

  return {
    reconcileDateIso: deps.reconcileDateIso,
    credentials: ids.length,
    failed: outcomes.filter((o) => o.errors.length > 0).length,
    outcomes,
  };
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
