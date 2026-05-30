import { SchedinaStatus } from "@prisma/client";
import { computeDedupKey } from "../domain/dedup";
import { assertValidTransition, type StatusDecision } from "../domain/transitions";
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
      .filter((r) => r.credentialId === credentialId && r.status === SchedinaStatus.PENDING)
      .map((r) => this.view(r));
  }

  async markSending(id: string): Promise<void> {
    const row = this.must(id);
    assertValidTransition(row.status, SchedinaStatus.SENDING);
    row.status = SchedinaStatus.SENDING;
  }

  async setPayloadSnapshot(id: string, payloadSnapshot: string): Promise<void> {
    this.must(id).payloadSnapshot = payloadSnapshot;
  }

  /** Aiuto per i test (non fa parte del port): legge lo snapshot salvato. */
  getPayloadSnapshot(id: string): string | null {
    return this.rows.get(id)?.payloadSnapshot ?? null;
  }

  async applyDecision(id: string, decision: StatusDecision): Promise<void> {
    const row = this.must(id);
    assertValidTransition(row.status, decision.status);
    row.status = decision.status;
    row.errorCod = decision.errorCod;
    row.errorDes = decision.errorDes;
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
