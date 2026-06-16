// Smart-send: l'INTELLIGENZA dell'auto-invio Alloggiati. Prima del Send (irreversibile) esegue il
// Test (dry-run, nessun cambio di stato) e invia SOLO le righe che il portale accetterebbe; quelle
// bocciate vanno in NEEDS_REVIEW (visibili all'host) e NON partono. Una riga passata dal Test è sicura
// da inviare; una bocciata non va mai in SENDING → zero rischio sull'irreversibile.
//
// PURO/orchestrazione: deps iniettate (verify, parkByIds, send) → unit-testabile senza rete/DB.
// Il `send` reale è l'outbox (processCredentialBatch), che invia le PENDING rimaste = solo le valide.

import type { VerifyBatchResult } from "./verify.service";

export interface SmartSendDeps {
  /** Dry-run Test del batch PENDING della credenziale (SchedinaVerifyService.verifyCredentialBatch). */
  verify(credentialId: string): Promise<VerifyBatchResult>;
  /** Parcheggia in NEEDS_REVIEW le schedine bocciate dal Test (SchedinaRepository.parkByIds). */
  parkByIds(ids: readonly string[]): Promise<number>;
  /** Invio reale del batch PENDING rimasto (outbox.processCredentialBatch). */
  send(credentialId: string): Promise<void>;
}

export interface SmartSendOutcome {
  credentialId: string;
  tested: number; // righe testate
  parked: number; // bocciate dal Test → NEEDS_REVIEW (0 in dry-run: non si parcheggia)
  sentBatch: boolean; // true se almeno una riga valida è stata inviata (sempre false in dry-run)
  dryRun: boolean; // true = solo Test + report, nessuna mutazione e nessun invio
  wouldSend: number; // righe che PASSEREBBERO il Test (inviate, o inviabili in dry-run)
  wouldPark: number; // righe che il Test BOCCEREBBE (parcheggiate, o da parcheggiare in dry-run)
}

export interface SmartSendOptions {
  /** dry-run: esegue il Test reale e riporta cosa farebbe, ma NON parcheggia, NON invia (zero rischi). */
  dryRun?: boolean;
}

/**
 * Test-gate poi invio. Se il Test boccia tutte le righe → nessun Send. Resiliente all'esterno solo
 * quanto basta: lascia propagare gli errori al chiamante (il cron-runner li isola per-credenziale).
 * In `dryRun` si ferma dopo il Test: nessun parcheggio, nessun invio → validazione a rischio zero.
 */
export async function verifyParkAndSend(
  deps: SmartSendDeps,
  credentialId: string,
  opts: SmartSendOptions = {},
): Promise<SmartSendOutcome> {
  const result = await deps.verify(credentialId);

  const invalidIds = result.rows.filter((r) => !r.valid).map((r) => r.schedinaId);
  const wouldPark = invalidIds.length;
  const wouldSend = result.valid;

  if (opts.dryRun) {
    // Solo Test (già eseguito sopra) + report: nessuna mutazione, nessuna acquisizione.
    return {
      credentialId,
      tested: result.total,
      parked: 0,
      sentBatch: false,
      dryRun: true,
      wouldSend,
      wouldPark,
    };
  }

  const parked = wouldPark > 0 ? await deps.parkByIds(invalidIds) : 0;
  // Restano da inviare solo le righe valide (le bocciate sono ora in NEEDS_REVIEW, fuori dall'outbox).
  const sentBatch = wouldSend > 0;
  if (sentBatch) await deps.send(credentialId);

  return {
    credentialId,
    tested: result.total,
    parked,
    sentBatch,
    dryRun: false,
    wouldSend,
    wouldPark,
  };
}
