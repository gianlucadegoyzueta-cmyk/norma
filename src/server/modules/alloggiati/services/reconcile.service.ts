import { SchedinaStatus } from "@prisma/client";
import type { RicevutaSummaryReader } from "../ports/RicevutaSummaryReader";
import type { SchedinaRepository } from "../ports/SchedinaRepository";

/** Verdetto del confronto di conteggio per il batch del giorno. */
export type ReconcileVerdict =
  /** schedineInviate === attese → tutte confermate (UNVERIFIED → ACQUIRED). */
  | "MATCH"
  /** ricevuta assente o schedineInviate === 0 → nulla è arrivato (UNVERIFIED → PENDING). */
  | "NONE_SENT"
  /** schedineInviate !== attese (e > 0) → mismatch non attribuibile (UNVERIFIED → NEEDS_REVIEW). */
  | "MISMATCH";

/** Esito della riconciliazione di una singola schedina UNVERIFIED. */
export interface ReconcileRowResult {
  schedinaId: string;
  /**
   * CONFIRMED = conteggi pari → ACQUIRED;
   * REQUEUED  = nulla inviato → PENDING (re-inviabile in sicurezza);
   * REVIEW    = mismatch → NEEDS_REVIEW (revisione umana del batch).
   */
  outcome: "CONFIRMED" | "REQUEUED" | "REVIEW";
}

export interface ReconcileResult {
  total: number;
  /** Conteggio atteso = schedine UNVERIFIED del giorno per la credenziale. */
  expected: number;
  /** "SCHEDINE INVIATE" lette dalla Ricevuta (0 se ricevuta assente). */
  reported: number;
  verdict: ReconcileVerdict;
  confirmed: number;
  requeued: number;
  review: number;
  rows: ReconcileRowResult[];
}

/**
 * Riconciliazione DIFFERITA (T+1) delle schedine rimaste UNVERIFIED (invio andato in timeout:
 * esito ignoto). È il rovescio della regola "mai ritentare alla cieca": invece di re-inviare e
 * rischiare un doppione IRREVERSIBILE, si CHIEDE al sistema cosa risulta acquisito, tramite la
 * Ricevuta del giorno dell'invio (interrogabile solo a giorno passato).
 *
 * RIDISEGNO PER CONTEGGIO (DECISIONS D3/D4). Verdetto Gate #0: la Ricevuta è AGGREGATA — riporta
 * il NUMERO di schedine inviate nel giorno, NON i nominativi. Non potendo più matchare per identità,
 * si confronta il CONTEGGIO:
 *
 *   attese (= schedine UNVERIFIED del giorno)  vs  "SCHEDINE INVIATE" della Ricevuta
 *
 *  - reported === attese        → MATCH    → tutte ACQUIRED (l'invio del batch era andato a buon fine).
 *  - reported === 0 / no ricevuta → NONE_SENT → tutte PENDING (nulla è arrivato → re-inviabili, no doppione).
 *  - reported !== attese (e > 0) → MISMATCH → tutte NEEDS_REVIEW: un mismatch di conteggio NON è
 *    attribuibile alla singola schedina (vedi D4), quindi l'intero batch del giorno va in revisione
 *    umana invece di rischiare un falso ACQUIRED (irreversibile) o un re-invio doppione.
 *
 * Il confronto è conservativo per costruzione: si auto-conferma SOLO a conteggi identici e si
 * auto-riaccoda SOLO a ricevuta vuota; ogni ambiguità diventa lavoro umano esplicito.
 */
export class SchedinaReconcileService {
  constructor(
    private readonly repo: Pick<SchedinaRepository, "listUnverifiedByCredential" | "applyDecision">,
    private readonly receipts: RicevutaSummaryReader,
  ) {}

  /**
   * Riconcilia le schedine UNVERIFIED di una credenziale contro la Ricevuta di `receiptDateIso`
   * (di norma il giorno in cui l'invio era partito, ora "passato" → interrogabile).
   */
  async reconcileCredential(
    credentialId: string,
    receiptDateIso: string,
  ): Promise<ReconcileResult> {
    const unverified = await this.repo.listUnverifiedByCredential(credentialId);
    if (unverified.length === 0) {
      return {
        total: 0,
        expected: 0,
        reported: 0,
        verdict: "NONE_SENT",
        confirmed: 0,
        requeued: 0,
        review: 0,
        rows: [],
      };
    }

    const summary = await this.receipts.summaryOn(credentialId, receiptDateIso);
    const expected = unverified.length;
    const reported = summary?.schedineInviate ?? 0;

    const { verdict, target, outcome } = decideBatch(expected, reported);

    const rows: ReconcileRowResult[] = [];
    for (const s of unverified) {
      await this.repo.applyDecision(s.id, { status: target, errorCod: null, errorDes: null });
      rows.push({ schedinaId: s.id, outcome });
    }

    return {
      total: unverified.length,
      expected,
      reported,
      verdict,
      confirmed: outcome === "CONFIRMED" ? rows.length : 0,
      requeued: outcome === "REQUEUED" ? rows.length : 0,
      review: outcome === "REVIEW" ? rows.length : 0,
      rows,
    };
  }
}

/** Decide il verdetto del batch e lo stato bersaglio dal confronto dei conteggi. PURA. */
function decideBatch(
  expected: number,
  reported: number,
): { verdict: ReconcileVerdict; target: SchedinaStatus; outcome: ReconcileRowResult["outcome"] } {
  if (reported === 0) {
    // Nulla risulta inviato quel giorno → nessuna delle UNVERIFIED è arrivata → re-inviabili.
    return { verdict: "NONE_SENT", target: SchedinaStatus.PENDING, outcome: "REQUEUED" };
  }
  if (reported === expected) {
    return { verdict: "MATCH", target: SchedinaStatus.ACQUIRED, outcome: "CONFIRMED" };
  }
  // Conteggi diversi e > 0: non sappiamo QUALI sono arrivate → tutto il batch a revisione umana.
  return { verdict: "MISMATCH", target: SchedinaStatus.NEEDS_REVIEW, outcome: "REVIEW" };
}
