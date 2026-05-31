import { SchedinaStatus } from "@prisma/client";
import type { ParsedReceipt, ReceiptParser, ReceiptProvider } from "../ports/ReceiptParser";
import type { SchedinaRepository } from "../ports/SchedinaRepository";

/**
 * RICONCILIAZIONE T+1 delle schedine UNVERIFIED (esito ignoto dopo un timeout/risposta persa).
 *
 * Disciplina di sicurezza (docs/alloggiati-web-architettura.md §1, §5) — l'invariante è "MAI un
 * doppione, perché è irreversibile":
 *  - schedina UNVERIFIED PRESENTE nella Ricevuta del giorno → è stata acquisita → ACQUIRED;
 *  - schedina UNVERIFIED ASSENTE → di DEFAULT resta UNVERIFIED (la segnaliamo per revisione umana):
 *    NON la ri-accodiamo alla cieca, perché una Ricevuta parziale o un match errato porterebbe a un
 *    RE-INVIO e quindi a un doppione. "In incertezza, preferire la conferma tardiva al doppione."
 *  - il re-queue automatico (UNVERIFIED → PENDING) è un OPT-IN esplicito (`requeueNotFound`), da usare
 *    solo quando si è certi che la Ricevuta sia completa per quel giorno.
 *
 * Lo `SchedinaIdentityKey` ricava da una schedina la stessa chiave che il parser estrae dalla
 * Ricevuta, così il confronto è `acquiredKeys.has(key)`. La schedina è identificata dal suo
 * `payloadSnapshot` (la riga di tracciato realmente inviata).
 */
export type SchedinaIdentityKey = (payloadSnapshot: string) => string;

export interface ReconciliationReport {
  /** Data della Ricevuta usata ("YYYY-MM-DD"), o null se non disponibile. */
  receiptDate: string | null;
  /** Schedine UNVERIFIED esaminate. */
  checked: number;
  /** Confermate ACQUIRED perché presenti in Ricevuta. */
  confirmedAcquired: number;
  /** Ri-accodate a PENDING (solo se requeueNotFound=true). */
  requeuedPending: number;
  /** Rimaste UNVERIFIED (assenti dalla Ricevuta e nessun re-queue): da rivedere a mano. */
  stillUnverified: number;
}

type ReconRepo = Pick<
  SchedinaRepository,
  "listUnverifiedByCredential" | "getPayloadSnapshot" | "applyDecision"
>;

export class SchedinaReconciliationService {
  constructor(
    private readonly repo: ReconRepo,
    private readonly receipts: ReceiptProvider,
    private readonly parser: ReceiptParser,
    private readonly identityKey: SchedinaIdentityKey,
    private readonly options: { requeueNotFound?: boolean } = {},
  ) {}

  /**
   * Concilia le schedine UNVERIFIED di una credenziale contro la Ricevuta di `date` (di norma ieri).
   * Se la Ricevuta non è ancora disponibile, NON cambia nulla (tutte restano UNVERIFIED).
   */
  async reconcileCredential(credentialId: string, date: string): Promise<ReconciliationReport> {
    const unverified = await this.repo.listUnverifiedByCredential(credentialId);
    const report: ReconciliationReport = {
      receiptDate: null,
      checked: unverified.length,
      confirmedAcquired: 0,
      requeuedPending: 0,
      stillUnverified: 0,
    };
    if (unverified.length === 0) return report;

    const pdf = await this.receipts.fetchReceipt(credentialId, date);
    if (!pdf) {
      // Ricevuta non disponibile per quel giorno: niente conferme, tutte restano UNVERIFIED.
      report.stillUnverified = unverified.length;
      return report;
    }

    const parsed: ParsedReceipt = await this.parser.parse(pdf);
    report.receiptDate = parsed.date;

    for (const s of unverified) {
      const snapshot = await this.repo.getPayloadSnapshot(s.id);
      // Senza snapshot non possiamo identificare la riga in Ricevuta: prudenza → resta UNVERIFIED.
      const key = snapshot ? this.identityKey(snapshot) : null;
      const acquired = key !== null && parsed.acquiredKeys.has(key);

      if (acquired) {
        await this.repo.applyDecision(s.id, {
          status: SchedinaStatus.ACQUIRED,
          errorCod: null,
          errorDes: null,
        });
        report.confirmedAcquired += 1;
      } else if (this.options.requeueNotFound) {
        // OPT-IN: la Ricevuta è completa e la riga non c'è → non è mai arrivata → ri-accoda.
        await this.repo.applyDecision(s.id, {
          status: SchedinaStatus.PENDING,
          errorCod: null,
          errorDes: null,
        });
        report.requeuedPending += 1;
      } else {
        // DEFAULT prudente: assente dalla Ricevuta ma non ri-accodiamo alla cieca → revisione umana.
        report.stillUnverified += 1;
      }
    }
    return report;
  }
}
