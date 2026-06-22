// Dominio PURO per la vista AGENZIA (property manager): aggrega per-immobile le metriche di
// compliance che fanno tornare l'economia di un'agenzia che gestisce N strutture da un solo
// account. Nessuna dipendenza da Prisma/IO: l'input è già letto dalle tabelle esistenti (una riga
// per immobile), l'output è deterministico e testabile. Niente query duplicate: chi legge da DB
// popola `PropertyComplianceInput[]` e questa funzione produce sia il totale d'organizzazione sia
// il drill-down per singolo immobile.

/**
 * Stato di prontezza ISTAT/movimento turistico di un immobile, derivato dai suoi metadati Ross1000.
 * NON è un invio (fuori scope): è solo "questo immobile è configurato per dichiarare?".
 */
export type IstatReadiness = "ready" | "incomplete";

/** Metriche grezze già lette (per UN immobile) che alimentano l'aggregazione d'agenzia. */
export interface PropertyComplianceInput {
  propertyId: string;
  propertyName: string;
  /** Nome del proprietario: utile a un'agenzia per raggruppare a colpo d'occhio. */
  proprietario: string;
  /** Comune (per il contesto territoriale nella riga di drill-down). */
  comuneName: string;
  provincia: string;
  /** L'immobile è collegato a una credenziale Alloggiati (può inviare schedine)? */
  hasCredential: boolean;
  /** Ha un CIN valido (load-bearing per la tassa di soggiorno)? */
  hasCin: boolean;
  /** Schedine "aperte" (PENDING/SENDING/UNVERIFIED) la cui deadline è già passata → urgenti. */
  schedineOverdue: number;
  /** Schedine preparate in attesa di conferma (PENDING/UNVERIFIED), entro deadline. */
  schedinePending: number;
  /** Check-in attesi per oggi su questo immobile (arrivi del giorno senza check-in completato). */
  checkinsToday: number;
  /** Tassa di soggiorno maturata nel periodo corrente, in centesimi. */
  taxAccruedCents: number;
  /** Ross1000 configurato (codice struttura presente) → può dichiarare il movimento turistico. */
  ross1000Ready: boolean;
}

/** Riga di drill-down per UN immobile: gli stessi numeri, ma con l'etichetta di prontezza ISTAT. */
export interface PropertyComplianceRow extends PropertyComplianceInput {
  istatReadiness: IstatReadiness;
  /** L'immobile richiede attenzione (qualcosa da inviare/rivedere/configurare)? */
  needsAttention: boolean;
}

/** Totali aggregati su TUTTI gli immobili dell'organizzazione. */
export interface AgencyTotals {
  propertyCount: number;
  /** Immobili senza credenziale Alloggiati collegata (non possono inviare schedine). */
  propertiesWithoutCredential: number;
  /** Immobili senza CIN (blocco a monte della tassa di soggiorno). */
  propertiesWithoutCin: number;
  schedineOverdue: number;
  schedinePending: number;
  checkinsToday: number;
  taxAccruedCents: number;
  /** Immobili pronti a dichiarare ISTAT (Ross1000 configurato). */
  istatReadyCount: number;
  /** Immobili NON pronti per ISTAT (Ross1000 mancante). */
  istatIncompleteCount: number;
  /** Immobili che richiedono attenzione (almeno una cosa da fare). */
  propertiesNeedingAttention: number;
}

export interface AgencyOverview {
  totals: AgencyTotals;
  /** Drill-down per immobile, ordinato: prima chi richiede più attenzione. */
  rows: PropertyComplianceRow[];
}

/** Un immobile è "pronto ISTAT" se ha il codice Ross1000; altrimenti incompleto. */
export function istatReadinessOf(input: PropertyComplianceInput): IstatReadiness {
  return input.ross1000Ready ? "ready" : "incomplete";
}

/**
 * Punteggio di urgenza di un immobile: serve SOLO a ordinare il drill-down (più alto = più in cima).
 * Pesi decrescenti per gravità: schedine in ritardo > check-in di oggi > schedine in attesa >
 * configurazione mancante (credenziale/CIN/Ross1000). Puro e deterministico.
 */
export function attentionScore(input: PropertyComplianceInput): number {
  let score = 0;
  score += input.schedineOverdue * 1000;
  score += input.checkinsToday * 100;
  score += input.schedinePending * 10;
  if (!input.hasCredential) score += 5;
  if (!input.hasCin) score += 3;
  if (!input.ross1000Ready) score += 1;
  return score;
}

/**
 * Compone la vista d'agenzia da una riga per immobile. Produce i totali d'organizzazione e le
 * righe di drill-down ordinate per urgenza decrescente (a parità, alfabetico stabile sul nome).
 * Pura: nessun accesso a DB. Senza immobili → totali a zero e righe vuote.
 */
export function buildAgencyOverview(inputs: readonly PropertyComplianceInput[]): AgencyOverview {
  const rows: PropertyComplianceRow[] = inputs.map((input) => {
    const needsAttention =
      input.schedineOverdue > 0 ||
      input.schedinePending > 0 ||
      input.checkinsToday > 0 ||
      !input.hasCredential ||
      !input.hasCin ||
      !input.ross1000Ready;
    return {
      ...input,
      istatReadiness: istatReadinessOf(input),
      needsAttention,
    };
  });

  rows.sort((a, b) => {
    const byScore = attentionScore(b) - attentionScore(a);
    if (byScore !== 0) return byScore;
    return a.propertyName.localeCompare(b.propertyName, "it");
  });

  const totals: AgencyTotals = {
    propertyCount: rows.length,
    propertiesWithoutCredential: rows.filter((r) => !r.hasCredential).length,
    propertiesWithoutCin: rows.filter((r) => !r.hasCin).length,
    schedineOverdue: sum(rows, (r) => r.schedineOverdue),
    schedinePending: sum(rows, (r) => r.schedinePending),
    checkinsToday: sum(rows, (r) => r.checkinsToday),
    taxAccruedCents: sum(rows, (r) => r.taxAccruedCents),
    istatReadyCount: rows.filter((r) => r.istatReadiness === "ready").length,
    istatIncompleteCount: rows.filter((r) => r.istatReadiness === "incomplete").length,
    propertiesNeedingAttention: rows.filter((r) => r.needsAttention).length,
  };

  return { totals, rows };
}

function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((acc, item) => acc + pick(item), 0);
}
