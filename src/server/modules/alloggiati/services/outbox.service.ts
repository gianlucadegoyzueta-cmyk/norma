import { SchedinaStatus } from "@prisma/client";
import { assertValidTransition, decideFromSendAttempt } from "../domain/transitions";
import { MAX_SEND_ATTEMPTS } from "../domain/send-policy";
import { SENDING_STALE_MS } from "../domain/sending-stale";
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
    await this.repo.recoverStaleSending(credentialId, SENDING_STALE_MS);
    // Parcheggia in NEEDS_REVIEW le PENDING che hanno esaurito i tentativi: diventano esplicite per
    // l'host invece di restare PENDING-inerti. listPendingByCredential le esclude comunque (cap).
    await this.repo.parkExhausted(credentialId, MAX_SEND_ATTEMPTS);

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

    // 2) CLAIM ATOMICO PENDING → SENDING (persistito PRIMA della rete). Solo le righe che QUESTO
    //    processo rivendica (claim true) vengono inviate: un batch concorrente sulla stessa
    //    credenziale vedrebbe claim=false e le salterebbe → mai doppio invio. Lo snapshot del
    //    tracciato si salva solo dopo aver vinto il claim.
    const claimed: { schedina: SchedinaRecord; record: string }[] = [];
    for (const item of built) {
      const won = await this.repo.claimForSending(item.schedina.id);
      if (!won) continue; // rivendicata da un altro invio in corso: la salto
      if (item.record) await this.repo.setPayloadSnapshot(item.schedina.id, item.record);
      claimed.push(item);
    }
    if (claimed.length === 0) return; // nulla da inviare (tutte già rivendicate altrove)

    // 3) invio del batch (solo le righe rivendicate da noi)
    const rows: SendRow[] = claimed.map(({ schedina, record }) => ({
      correlationId: schedina.id,
      record,
    }));

    let resultsById: Map<string, SendRowResult>;
    try {
      const res = await this.sender.send({ credentialId, rows });
      resultsById = new Map(res.results.map((r) => [r.correlationId, r]));
    } catch {
      // nessuna risposta: esito ignoto → UNVERIFIED per tutte le schedine in volo (rivendicate da noi)
      for (const { schedina } of claimed) {
        await this.repo.applyDecision(schedina.id, decideFromSendAttempt({ kind: "NO_RESPONSE" }));
      }
      return;
    }

    // 4) applica la decisione per ciascuna schedina rivendicata
    for (const { schedina } of claimed) {
      const r = resultsById.get(schedina.id);
      const attempt: SendAttempt = mapResultToAttempt(r);
      await this.repo.applyDecision(schedina.id, decideFromSendAttempt(attempt));
    }
  }
}

/** Mappa l'esito di una riga in un SendAttempt. Riga senza esito → prudenza: UNVERIFIED. */
function mapResultToAttempt(result: SendRowResult | undefined): SendAttempt {
  if (!result) return { kind: "NO_RESPONSE" };
  if (result.outcome === "ACQUIRED") return { kind: "ACQUIRED" };
  return { kind: "REJECTED", errorCod: result.errorCod, errorDes: result.errorDes };
}
