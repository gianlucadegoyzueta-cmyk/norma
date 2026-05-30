import { SchedinaStatus } from "@prisma/client";
import { assertValidTransition, decideFromSendAttempt } from "../domain/transitions";
import type { SendAttempt } from "../domain/types";
import type { AlloggiatiSender, SendRow, SendRowResult } from "../ports/AlloggiatiSender";
import type { SchedinaRecord, SchedinaRepository } from "../ports/SchedinaRepository";

// NOTA — Finestra di invio (data di arrivo).
// L'outbox invia solo schedine già in PENDING. La regola "la data di arrivo dev'essere OGGI o IERI"
// (verificata in Fase D: oltre, Alloggiati risponde cod. 12 "Data di Arrivo Errata") è applicata
// A MONTE, in `StaysService.generateSchedine` (vedi `isArrivalWithinSendWindow`): un soggiorno fuori
// finestra NON genera schedine. Così l'outbox non si trova mai a inviare una schedina destinata a un
// rifiuto certo. Se una schedina resta a lungo in PENDING e sfora la finestra, l'invio verrà
// (correttamente) rifiutato e gestito come REJECTED — non un doppione, quindi nessun rischio.

/**
 * Costruisce la riga di tracciato per una schedina. In produzione è `SchedinaRecordBuilder.build`
 * (carica dal DB + resolver + buildTracciatoRecord); può essere sincrono nei test.
 */
export type RecordBuilder = (schedinaId: string) => string | Promise<string>;

/**
 * Orchestrazione dell'OUTBOX.
 *
 * Sequenza per ogni batch (una credenziale):
 *  1. tutte le schedine PENDING → SENDING, PERSISTITO PRIMA della rete
 *     (così un crash a metà lascia traccia in SENDING, non perde l'invio);
 *  2. invio del batch tramite il port (astratto: nessun SOAP qui);
 *  3. si applica la decisione riga-per-riga (ACQUIRED / REJECTED / UNVERIFIED).
 *
 * REGOLA DI SICUREZZA: in assenza di risposta (eccezione del sender) NON si ritenta
 * alla cieca → UNVERIFIED, da riconciliare a T+1. Un doppione è irreversibile.
 */
export class SchedinaOutboxService {
  constructor(
    private readonly repo: SchedinaRepository,
    private readonly sender: AlloggiatiSender,
    private readonly buildRecord: RecordBuilder = () => "",
  ) {}

  async processCredentialBatch(credentialId: string): Promise<void> {
    const pending = await this.repo.listPendingByCredential(credentialId);
    if (pending.length === 0) return;

    // 0) PRE-AUTENTICAZIONE (se il sender la espone): ottiene il token SENZA inviare nulla.
    //    Un fallimento di AUTENTICAZIONE è deterministico e avviene PRIMA di qualsiasi invio →
    //    lo lasciamo PROPAGARE: nessuna schedina cambia stato, restano PENDING (ri-provabili dopo
    //    il re-onboarding). NON va confuso con il timeout dell'invio vero (→ UNVERIFIED, sotto).
    //    Così non marchiamo mai SENDING/UNVERIFIED schedine che non sono mai partite.
    await this.sender.prepare?.(credentialId);

    // 1) Costruisci TUTTE le righe PRIMA di toccare lo stato. Se un record non è costruibile
    //    (es. tabelle di riferimento vuote) si lancia qui e NESSUNA schedina passa a SENDING.
    const built: { schedina: SchedinaRecord; record: string }[] = [];
    for (const s of pending) {
      assertValidTransition(s.status, SchedinaStatus.SENDING);
      built.push({ schedina: s, record: await this.buildRecord(s.id) });
    }

    // 2) PENDING → SENDING (persistito PRIMA della rete), salvando lo snapshot del tracciato.
    for (const { schedina, record } of built) {
      if (record) await this.repo.setPayloadSnapshot(schedina.id, record);
      await this.repo.markSending(schedina.id);
    }

    // 3) invio del batch
    const rows: SendRow[] = built.map(({ schedina, record }) => ({
      correlationId: schedina.id,
      record,
    }));

    let resultsById: Map<string, SendRowResult>;
    try {
      const res = await this.sender.send({ credentialId, rows });
      resultsById = new Map(res.results.map((r) => [r.correlationId, r]));
    } catch {
      // nessuna risposta: esito ignoto → UNVERIFIED per tutte le schedine in volo
      for (const s of pending) {
        await this.repo.applyDecision(s.id, decideFromSendAttempt({ kind: "NO_RESPONSE" }));
      }
      return;
    }

    // 3) applica la decisione per ciascuna schedina
    for (const s of pending) {
      const r = resultsById.get(s.id);
      const attempt: SendAttempt = mapResultToAttempt(r);
      await this.repo.applyDecision(s.id, decideFromSendAttempt(attempt));
    }
  }
}

/** Mappa l'esito di una riga in un SendAttempt. Riga senza esito → prudenza: UNVERIFIED. */
function mapResultToAttempt(result: SendRowResult | undefined): SendAttempt {
  if (!result) return { kind: "NO_RESPONSE" };
  if (result.outcome === "ACQUIRED") return { kind: "ACQUIRED" };
  return { kind: "REJECTED", errorCod: result.errorCod, errorDes: result.errorDes };
}
