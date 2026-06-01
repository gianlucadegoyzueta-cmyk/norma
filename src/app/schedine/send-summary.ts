import { mapAlloggiatiError } from "./error-codes";
import type { SendSummary } from "./types";

/**
 * Riga di schedina (sottoinsieme di SchedinaListItem) sufficiente a derivare il riepilogo d'invio.
 * Tenuto volutamente disaccoppiato da Prisma per essere testabile come funzione pura.
 */
export interface SentRow {
  status: string;
  guestName: string;
  lastErrorCod: string | null;
  lastErrorDes: string | null;
}

/**
 * Deriva il riepilogo (conteggi per esito + dettaglio respinte) dagli stati delle schedine
 * AGGIORNATI dopo il batch. Non tocca il dominio: legge solo gli stati già persistiti.
 */
export function buildSendSummary(rows: readonly SentRow[]): SendSummary {
  let acquired = 0;
  let rejected = 0;
  let unverified = 0;
  const rejectedRows: SendSummary["rejectedRows"] = [];

  for (const r of rows) {
    if (r.status === "ACQUIRED") {
      acquired += 1;
    } else if (r.status === "REJECTED") {
      rejected += 1;
      rejectedRows.push({
        guestName: r.guestName,
        errorCod: r.lastErrorCod,
        message: mapAlloggiatiError(r.lastErrorCod, r.lastErrorDes),
      });
    } else if (r.status === "UNVERIFIED") {
      unverified += 1;
    }
    // PENDING/SENDING residui (rari: claim non riuscito) non entrano nel riepilogo d'esito.
  }

  return { acquired, rejected, unverified, rejectedRows };
}

/**
 * Riga di riepilogo testuale e accessibile (usata anche come fallback per aria-live):
 * es. "3 acquisite · 1 respinta · 1 da verificare". Omette gli esiti a zero.
 */
export function summaryLine(s: SendSummary): string {
  const parts: string[] = [];
  if (s.acquired > 0) parts.push(`${s.acquired} ${s.acquired === 1 ? "acquisita" : "acquisite"}`);
  if (s.rejected > 0) parts.push(`${s.rejected} ${s.rejected === 1 ? "respinta" : "respinte"}`);
  if (s.unverified > 0) parts.push(`${s.unverified} da verificare`);
  return parts.join(" · ");
}

/** True se non c'è alcun esito da mostrare (nessuna riga elaborata). */
export function isEmptySummary(s: SendSummary): boolean {
  return s.acquired === 0 && s.rejected === 0 && s.unverified === 0;
}
