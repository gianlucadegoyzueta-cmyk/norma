// Dominio PURO dello "Storico compliance": il verdetto mensile "posizione regolare", calcolato
// RETROATTIVAMENTE dai dati esistenti (niente nuovi campi a DB). Nessun I/O qui.
//
// Cosa rende un mese "regolare":
//   - SCHEDINE: tutte le schedine dovute per gli arrivi del mese risultano ACQUISITE
//     (schedineAcquired >= schedineExpected). Una schedina non acquisita = posizione non regolare.
//   - TASSA: nessuna dichiarazione del periodo è rimasta in lavorazione (DRAFT/READY). Se l'host
//     non ha (ancora) registrato dichiarazioni, la tassa non pesa sul verdetto (non possiamo
//     inferire un dovuto che non esiste a sistema).
//
// Un mese SENZA attività (né schedine né dichiarazioni) è "quiet": non è né regolare né da
// sistemare, semplicemente non c'è stato movimento. Lo mostriamo neutro, non come ✓ ingannevole.

export type ComplianceVerdict = "regular" | "attention" | "quiet";

/** Conteggi grezzi di un mese (li produce l'adapter; il dominio decide il verdetto). */
export interface MonthComplianceFigures {
  /** Mese "YYYY-MM". */
  month: string;
  /** Schedine dovute per gli arrivi del mese (totale righe outbox). */
  schedineExpected: number;
  /** Di quelle, acquisite dalla Questura. */
  schedineAcquired: number;
  /** Dichiarazioni tassa di soggiorno del periodo (qualsiasi stato). */
  taxDeclarations: number;
  /** Di quelle, ancora in lavorazione (DRAFT/READY) → pendenti. */
  taxPending: number;
}

export interface MonthComplianceRow extends MonthComplianceFigures {
  verdict: ComplianceVerdict;
  /** Schedine dovute ma non ancora acquisite (schedineExpected - schedineAcquired, mai < 0). */
  schedineMissing: number;
}

/** Verdetto del mese a partire dai conteggi grezzi. Puro: stesso input → stesso output. */
export function verdictForMonth(f: MonthComplianceFigures): ComplianceVerdict {
  const hasActivity = f.schedineExpected > 0 || f.taxDeclarations > 0;
  if (!hasActivity) return "quiet";
  const schedineOk = f.schedineAcquired >= f.schedineExpected;
  const taxOk = f.taxPending === 0;
  return schedineOk && taxOk ? "regular" : "attention";
}

/** Arricchisce i conteggi col verdetto e le schedine mancanti (per la riga di registro). */
export function toComplianceRow(f: MonthComplianceFigures): MonthComplianceRow {
  return {
    ...f,
    verdict: verdictForMonth(f),
    schedineMissing: Math.max(0, f.schedineExpected - f.schedineAcquired),
  };
}

/**
 * Gli ultimi `count` mesi come "YYYY-MM", dal più recente al più vecchio, a partire da `now`.
 * Puro: utile sia all'adapter (per le query) sia ai test.
 */
export function recentMonths(now: Date, count: number): string[] {
  const out: string[] = [];
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth(); // 0-based
  for (let i = 0; i < count; i++) {
    out.push(`${year}-${String(month + 1).padStart(2, "0")}`);
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }
  return out;
}

/** Confini [start, end) di un mese "YYYY-MM" in UTC. Lancia se il formato è errato. */
export function monthBounds(month: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) throw new Error(`Mese non valido (atteso YYYY-MM): ${month}`);
  const year = Number(m[1]);
  const mon = Number(m[2]);
  return {
    start: new Date(Date.UTC(year, mon - 1, 1)),
    end: new Date(Date.UTC(year, mon, 1)),
  };
}

/** "giugno 2026" da "2026-06" (per l'intestazione di riga). */
export function humanMonth(month: string): string {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month);
  if (!m) return month;
  const names = [
    "gennaio",
    "febbraio",
    "marzo",
    "aprile",
    "maggio",
    "giugno",
    "luglio",
    "agosto",
    "settembre",
    "ottobre",
    "novembre",
    "dicembre",
  ];
  return `${names[Number(m[2]) - 1]} ${m[1]}`;
}
