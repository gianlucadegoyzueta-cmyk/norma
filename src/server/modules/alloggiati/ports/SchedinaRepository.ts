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
  /** Schedine UNVERIFIED di una credenziale: esito ignoto, da chiarire con la riconciliazione T+1. */
  listUnverifiedByCredential(credentialId: string): Promise<SchedinaRecord[]>;
  /** Porta una schedina in SENDING (validando la transizione). */
  markSending(id: string): Promise<void>;
  /**
   * CLAIM ATOMICO per l'invio: porta la schedina da PENDING a SENDING SOLO se è ancora PENDING,
   * in un'unica operazione condizionale. Ritorna `true` se l'ha rivendicata QUESTO processo,
   * `false` se era già stata presa (da un invio concorrente) o non è più PENDING.
   * È la barriera anti-doppio-invio quando due batch girano in parallelo sulla stessa credenziale:
   * solo chi ottiene `true` può inviare quella riga; gli altri la saltano. Un doppione è irreversibile.
   */
  claimForSending(id: string): Promise<boolean>;
  /** Salva la riga di tracciato come snapshot di audit (ciò che verrà/è stato inviato). */
  setPayloadSnapshot(id: string, payloadSnapshot: string): Promise<void>;
  /** Legge lo snapshot del tracciato salvato (serve alla riconciliazione per ricavare l'identità). */
  getPayloadSnapshot(id: string): Promise<string | null>;
  /** Applica la decisione (ACQUIRED/REJECTED/UNVERIFIED) validando la transizione. */
  applyDecision(id: string, decision: StatusDecision): Promise<void>;

  /**
   * Schedine in SENDING da più di `staleAfterMs` → UNVERIFIED (esito ignoto post-crash).
   * Ritorna quante righe sono state recuperate.
   */
  recoverStaleSending(credentialId: string, staleAfterMs: number): Promise<number>;

  /**
   * Parcheggia in NEEDS_REVIEW le schedine PENDING che hanno esaurito i tentativi
   * (attempts >= maxAttempts): smettono di essere ritentate in automatico e diventano VISIBILI
   * all'host per un intervento manuale. Ritorna quante ne sono state parcheggiate.
   */
  parkExhausted(credentialId: string, maxAttempts: number): Promise<number>;

  /**
   * Parcheggia in NEEDS_REVIEW le schedine PENDING tra gli `ids` indicati (le righe bocciate dal
   * Test dry-run prima dell'auto-send): NON verranno inviate, restano visibili all'host. Salta gli id
   * non più PENDING (idempotente). Ritorna quante ne sono state parcheggiate.
   */
  parkByIds(ids: readonly string[]): Promise<number>;

  /**
   * Rimette in coda una schedina NEEDS_REVIEW (→ PENDING) AZZERANDO i tentativi, così l'host può
   * ritentare dopo aver risolto. Isolamento garantito a monte (chiamata dopo findById per org).
   */
  reopenForRetry(id: string): Promise<void>;
}
