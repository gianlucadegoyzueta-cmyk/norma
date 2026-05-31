import { SchedinaStatus } from "@prisma/client";
import { canonicalIdentityKey, parseIdentityFromRecord } from "../domain/tracciato";
import type { AcquisitionReceiptReader } from "../ports/AcquisitionReceiptReader";
import type { SchedinaRepository } from "../ports/SchedinaRepository";

/** Esito della riconciliazione di una singola schedina UNVERIFIED. */
export interface ReconcileRowResult {
  schedinaId: string;
  /** CONFIRMED = trovata in ricevuta → ACQUIRED; REQUEUED = non trovata → torna PENDING. */
  outcome: "CONFIRMED" | "REQUEUED";
}

export interface ReconcileResult {
  total: number;
  confirmed: number;
  requeued: number;
  rows: ReconcileRowResult[];
}

/**
 * Riconciliazione DIFFERITA (T+1) delle schedine rimaste UNVERIFIED (invio andato in timeout:
 * esito ignoto). È il rovescio della regola "mai ritentare alla cieca": invece di re-inviare e
 * rischiare un doppione IRREVERSIBILE, si CHIEDE al sistema cosa risulta acquisito, tramite la
 * Ricevuta del giorno dell'invio (interrogabile solo a giorno passato).
 *
 *  - identità presente in ricevuta → l'invio ERA andato a buon fine → UNVERIFIED → ACQUIRED.
 *  - identità ASSENTE              → l'invio non è arrivato            → UNVERIFIED → PENDING (ri-accodata).
 *
 * Il match avviene per IDENTITÀ NOMINATIVA (cognome+nome+data di nascita), ricavata dallo snapshot
 * del tracciato effettivamente inviato: è l'unico dato che una ricevuta nominativa può contenere
 * (non conosce i nostri id/dedupKey). Per il confine "fragile" della lettura del PDF vedi il port.
 */
export class SchedinaReconcileService {
  constructor(
    private readonly repo: Pick<
      SchedinaRepository,
      "listUnverifiedByCredential" | "getPayloadSnapshot" | "applyDecision"
    >,
    private readonly receipts: AcquisitionReceiptReader,
  ) {}

  /**
   * Riconcilia le schedine UNVERIFIED di una credenziale contro la ricevuta di `receiptDateIso`
   * (di norma il giorno in cui l'invio era partito, ora "passato" → interrogabile).
   */
  async reconcileCredential(
    credentialId: string,
    receiptDateIso: string,
  ): Promise<ReconcileResult> {
    const unverified = await this.repo.listUnverifiedByCredential(credentialId);
    if (unverified.length === 0) return { total: 0, confirmed: 0, requeued: 0, rows: [] };

    const acquired = await this.receipts.acquiredOn(credentialId, receiptDateIso);
    const acquiredKeys = new Set(acquired.map((id) => canonicalIdentityKey(id)));

    const rows: ReconcileRowResult[] = [];
    for (const s of unverified) {
      const snapshot = await this.repo.getPayloadSnapshot(s.id);
      const confirmed = snapshot
        ? acquiredKeys.has(canonicalIdentityKey(parseIdentityFromRecord(snapshot)))
        : false;

      if (confirmed) {
        await this.repo.applyDecision(s.id, {
          status: SchedinaStatus.ACQUIRED,
          errorCod: null,
          errorDes: null,
        });
        rows.push({ schedinaId: s.id, outcome: "CONFIRMED" });
      } else {
        // Non risulta acquisita: torna PENDING → potrà essere re-inviata in sicurezza (nessun doppione).
        await this.repo.applyDecision(s.id, {
          status: SchedinaStatus.PENDING,
          errorCod: null,
          errorDes: null,
        });
        rows.push({ schedinaId: s.id, outcome: "REQUEUED" });
      }
    }

    return {
      total: unverified.length,
      confirmed: rows.filter((r) => r.outcome === "CONFIRMED").length,
      requeued: rows.filter((r) => r.outcome === "REQUEUED").length,
      rows,
    };
  }
}
