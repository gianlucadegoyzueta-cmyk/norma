import { SchedinaStatus } from "@prisma/client";
import { computeDedupKey } from "../domain/dedup";
import { MAX_SEND_ATTEMPTS } from "../domain/send-policy";
import {
  assertValidTransition,
  decideFromSendAttempt,
  type StatusDecision,
} from "../domain/transitions";
import type {
  CreateIntentInput,
  CreateIntentResult,
  SchedinaRecord,
  SchedinaRepository,
} from "../ports/SchedinaRepository";

interface Row extends SchedinaRecord {
  errorCod: string | null;
  errorDes: string | null;
  payloadSnapshot: string | null;
  sentAt: Date | null;
  attempts: number;
}

/**
 * Repository IN MEMORIA per testare la logica dell'outbox senza database.
 * Mima il vincolo UNIQUE (organizationId, dedupKey) per validare l'anti-doppione
 * a livello applicativo. La garanzia "vera" resta il vincolo Postgres, verificato
 * dal test di integrazione.
 */
export class InMemorySchedinaRepository implements SchedinaRepository {
  private readonly rows = new Map<string, Row>();
  private seq = 0;

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const dedupKey = computeDedupKey(input.dedup);
    const existing = [...this.rows.values()].find(
      (r) => r.organizationId === input.organizationId && r.dedupKey === dedupKey,
    );
    if (existing) {
      return { schedina: this.view(existing), created: false };
    }
    const row: Row = {
      id: `mem_${++this.seq}`,
      organizationId: input.organizationId,
      credentialId: input.credentialId,
      status: SchedinaStatus.PENDING,
      dedupKey,
      errorCod: null,
      errorDes: null,
      payloadSnapshot: null,
      sentAt: null,
      attempts: 0,
    };
    this.rows.set(row.id, row);
    return { schedina: this.view(row), created: true };
  }

  async findById(id: string, organizationId: string): Promise<SchedinaRecord | null> {
    const row = this.rows.get(id);
    // Stesso isolamento dell'adapter Prisma: id di un'altra org → null.
    return row && row.organizationId === organizationId ? this.view(row) : null;
  }

  async listPendingByCredential(credentialId: string): Promise<SchedinaRecord[]> {
    return [...this.rows.values()]
      .filter(
        (r) =>
          r.credentialId === credentialId &&
          r.status === SchedinaStatus.PENDING &&
          // esauriti i tentativi → non più auto-inviata (vedi MAX_SEND_ATTEMPTS)
          r.attempts < MAX_SEND_ATTEMPTS,
      )
      .map((r) => this.view(r));
  }

  async listUnverifiedByCredential(credentialId: string): Promise<SchedinaRecord[]> {
    return [...this.rows.values()]
      .filter((r) => r.credentialId === credentialId && r.status === SchedinaStatus.UNVERIFIED)
      .map((r) => this.view(r));
  }

  async markSending(id: string): Promise<void> {
    const row = this.must(id);
    assertValidTransition(row.status, SchedinaStatus.SENDING);
    row.status = SchedinaStatus.SENDING;
  }

  /**
   * Claim atomico PENDING→SENDING: `true` solo se la riga era PENDING (e la rivendica), `false`
   * altrimenti. In JS single-thread il check-and-set è di per sé atomico; rispecchia il contratto
   * del DB (updateMany condizionale) per testare la protezione anti-doppio-invio concorrente.
   */
  async claimForSending(id: string): Promise<boolean> {
    const row = this.must(id);
    if (row.status !== SchedinaStatus.PENDING) return false;
    row.status = SchedinaStatus.SENDING;
    row.sentAt = new Date();
    // L'incremento di `attempts` è di esclusiva competenza del claim (un tentativo = un claim
    // vinto), così non c'è doppio conteggio con le transizioni successive.
    row.attempts += 1;
    return true;
  }

  async setPayloadSnapshot(id: string, payloadSnapshot: string): Promise<void> {
    this.must(id).payloadSnapshot = payloadSnapshot;
  }

  async getPayloadSnapshot(id: string): Promise<string | null> {
    return this.rows.get(id)?.payloadSnapshot ?? null;
  }

  async applyDecision(id: string, decision: StatusDecision): Promise<void> {
    const row = this.must(id);
    assertValidTransition(row.status, decision.status);
    row.status = decision.status;
    row.errorCod = decision.errorCod;
    row.errorDes = decision.errorDes;
  }

  async recoverStaleSending(credentialId: string, staleAfterMs: number): Promise<number> {
    const cutoff = Date.now() - staleAfterMs;
    let count = 0;
    for (const row of this.rows.values()) {
      if (row.credentialId !== credentialId || row.status !== SchedinaStatus.SENDING) continue;
      if (!row.sentAt || row.sentAt.getTime() > cutoff) continue;
      await this.applyDecision(row.id, decideFromSendAttempt({ kind: "NO_RESPONSE" }));
      count += 1;
    }
    return count;
  }

  async parkExhausted(credentialId: string, maxAttempts: number): Promise<number> {
    let count = 0;
    for (const row of this.rows.values()) {
      if (row.credentialId !== credentialId || row.status !== SchedinaStatus.PENDING) continue;
      if (row.attempts < maxAttempts) continue;
      assertValidTransition(row.status, SchedinaStatus.NEEDS_REVIEW);
      row.status = SchedinaStatus.NEEDS_REVIEW;
      count += 1;
    }
    return count;
  }

  async reopenForRetry(id: string): Promise<void> {
    const row = this.must(id);
    assertValidTransition(row.status, SchedinaStatus.PENDING);
    row.status = SchedinaStatus.PENDING;
    row.attempts = 0;
    row.errorCod = null;
    row.errorDes = null;
  }

  /** Solo test: simula un invio SENDING abbandonato impostando sentAt nel passato. */
  setSentAtForTest(id: string, sentAt: Date): void {
    this.must(id).sentAt = sentAt;
  }

  /** Solo test: forza il numero di tentativi cumulati (per verificare il cap). */
  setAttemptsForTest(id: string, attempts: number): void {
    this.must(id).attempts = attempts;
  }

  /** Solo test: legge i tentativi cumulati. */
  getAttemptsForTest(id: string): number {
    return this.must(id).attempts;
  }

  private must(id: string): Row {
    const row = this.rows.get(id);
    if (!row) throw new Error(`Schedina non trovata: ${id}`);
    return row;
  }

  private view(row: Row): SchedinaRecord {
    return {
      id: row.id,
      organizationId: row.organizationId,
      credentialId: row.credentialId,
      status: row.status,
      dedupKey: row.dedupKey,
    };
  }
}
