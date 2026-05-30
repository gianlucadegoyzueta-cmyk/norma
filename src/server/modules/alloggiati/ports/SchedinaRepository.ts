import type { SchedinaStatus } from "@prisma/client";
import type { StatusDecision } from "../domain/transitions";
import type { DedupKeyInput } from "../domain/types";

/** Vista minima di una schedina usata dall'outbox (sottoinsieme della riga DB). */
export interface SchedinaRecord {
  id: string;
  organizationId: string;
  credentialId: string;
  status: SchedinaStatus;
  dedupKey: string;
}

/** Input per creare un "intento" di schedina (prima dell'invio). */
export interface CreateIntentInput {
  organizationId: string;
  credentialId: string;
  guestId: string;
  dedup: DedupKeyInput;
  /** Scadenza normativa: arrivo +24h (o +6h se soggiorno ≤24h). */
  deadlineAt: Date;
}

export interface CreateIntentResult {
  schedina: SchedinaRecord;
  /** false se esisteva già un intento con la stessa dedup-key (anti-doppione). */
  created: boolean;
}

/**
 * PORT del repository delle schedine. L'adapter reale usa Prisma/Postgres;
 * nei test usiamo un'implementazione in memoria.
 */
export interface SchedinaRepository {
  /** Crea l'intento in modo IDEMPOTENTE: due intenti identici → una sola riga. */
  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  /** Lettura per id SEMPRE filtrata per organizationId: un record di un'altra org NON è
   *  restituibile, indipendentemente dal chiamante (isolamento garantito dal repository). */
  findById(id: string, organizationId: string): Promise<SchedinaRecord | null>;
  listPendingByCredential(credentialId: string): Promise<SchedinaRecord[]>;
  /** Porta una schedina in SENDING (validando la transizione). */
  markSending(id: string): Promise<void>;
  /** Salva la riga di tracciato come snapshot di audit (ciò che verrà/è stato inviato). */
  setPayloadSnapshot(id: string, payloadSnapshot: string): Promise<void>;
  /** Applica la decisione (ACQUIRED/REJECTED/UNVERIFIED) validando la transizione. */
  applyDecision(id: string, decision: StatusDecision): Promise<void>;
}
