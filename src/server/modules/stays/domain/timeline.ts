// Timeline del soggiorno — storia end-to-end, calcolata SOLO da dati esistenti (stato import,
// check-in, outbox schedine, ricevute, tassa dichiarata). PURO: dati in → eventi ordinati out.
// Niente campi nuovi nello schema. La copy (italiano, "Norma:") è scelta nella UI dal `kind`.

import type { ReservationSource } from "@prisma/client";

/** Tipo di evento della timeline (la UI mappa kind → testo). */
export type StayTimelineKind =
  | "created" // soggiorno creato a mano dall'host
  | "imported" // importato da un feed iCal (azione di Norma)
  | "checkin" // l'ospite ha completato il check-in online
  | "schedina_prepared" // schedine preparate nell'outbox (azione di Norma)
  | "schedina_sent" // schedine inviate ad Alloggiati (azione di Norma)
  | "schedina_acquired" // acquisite dalla Questura, con ricevuta (azione di Norma)
  | "tax_counted" // imposta di soggiorno conteggiata in una dichiarazione (azione di Norma)
  | "tax_submitted"; // dichiarazione inviata al comune (azione di Norma)

export interface StayTimelineEvent {
  kind: StayTimelineKind;
  at: Date;
  /** true se è un'azione compiuta da Norma (la UI antepone "Norma:"). */
  byNorma: boolean;
  /** Conteggio associato (es. quante schedine), quando ha senso. */
  count?: number;
  /** Sorgente import (solo kind "imported"). */
  source?: ReservationSource;
  /** Riferimento ricevuta (solo kind "schedina_acquired"), se presente. */
  receiptRef?: string | null;
  /** Importo in centesimi (eventi tassa). */
  amountCents?: number;
  /** Etichetta periodo (eventi tassa), es. "2026-05". */
  periodLabel?: string;
}

export interface StayTimelineInput {
  stay: {
    createdAt: Date;
    importSource: ReservationSource | null;
  };
  /** Check-in completati (solo i token con completedAt valorizzato). */
  checkins: { completedAt: Date }[];
  /** Una riga per schedina del soggiorno (un ospite : una schedina). */
  schedine: {
    createdAt: Date;
    sentAt: Date | null;
    acquiredAt: Date | null;
    receiptRef: string | null;
  }[];
  /** Righe tassa di soggiorno che includono questo soggiorno (può essere in più dichiarazioni). */
  tax: {
    amountCents: number;
    countedAt: Date;
    periodLabel: string;
    submittedAt: Date | null;
  }[];
}

/** Il `at` minimo tra valori non-null; undefined se la lista è vuota. */
function earliest(dates: (Date | null)[]): Date | undefined {
  const valid = dates.filter((d): d is Date => d !== null);
  if (valid.length === 0) return undefined;
  return valid.reduce((a, b) => (b.getTime() < a.getTime() ? b : a));
}

/**
 * Costruisce la timeline del soggiorno: aggrega le schedine per traguardo (preparate / inviate /
 * acquisite) così un soggiorno con N ospiti non genera N×3 righe, e ordina cronologicamente.
 * Deterministico. Mostra solo ciò che è realmente accaduto (nessun evento "previsto").
 */
export function buildStayTimeline(input: StayTimelineInput): StayTimelineEvent[] {
  const events: StayTimelineEvent[] = [];

  // 1) Origine del soggiorno: import iCal (Norma) oppure creazione manuale (host).
  if (input.stay.importSource) {
    events.push({
      kind: "imported",
      at: input.stay.createdAt,
      byNorma: true,
      source: input.stay.importSource,
    });
  } else {
    events.push({ kind: "created", at: input.stay.createdAt, byNorma: false });
  }

  // 2) Check-in online completato: prendiamo il primo completamento come momento del check-in.
  const firstCheckin = earliest(input.checkins.map((c) => c.completedAt));
  if (firstCheckin) {
    events.push({ kind: "checkin", at: firstCheckin, byNorma: false });
  }

  // 3) Schedine: aggregate per traguardo.
  if (input.schedine.length > 0) {
    const preparedAt = earliest(input.schedine.map((s) => s.createdAt));
    if (preparedAt) {
      events.push({
        kind: "schedina_prepared",
        at: preparedAt,
        byNorma: true,
        count: input.schedine.length,
      });
    }

    const sent = input.schedine.filter((s) => s.sentAt !== null);
    const sentAt = earliest(sent.map((s) => s.sentAt));
    if (sentAt) {
      events.push({ kind: "schedina_sent", at: sentAt, byNorma: true, count: sent.length });
    }

    const acquired = input.schedine.filter((s) => s.acquiredAt !== null);
    const acquiredAt = earliest(acquired.map((s) => s.acquiredAt));
    if (acquiredAt) {
      // Riferimento ricevuta: il primo non vuoto tra le schedine acquisite (riconciliazione T+1).
      const receiptRef = acquired.map((s) => s.receiptRef).find((r) => r) ?? null;
      events.push({
        kind: "schedina_acquired",
        at: acquiredAt,
        byNorma: true,
        count: acquired.length,
        receiptRef,
      });
    }
  }

  // 4) Tassa di soggiorno: conteggiata e (se inviata) dichiarata.
  for (const t of input.tax) {
    events.push({
      kind: "tax_counted",
      at: t.countedAt,
      byNorma: true,
      amountCents: t.amountCents,
      periodLabel: t.periodLabel,
    });
    if (t.submittedAt) {
      events.push({
        kind: "tax_submitted",
        at: t.submittedAt,
        byNorma: true,
        amountCents: t.amountCents,
        periodLabel: t.periodLabel,
      });
    }
  }

  // Ordine cronologico; a parità di istante, l'ordine di inserimento (stabile) tiene il flusso logico.
  return events
    .map((e, i) => ({ e, i }))
    .sort((a, b) => a.e.at.getTime() - b.e.at.getTime() || a.i - b.i)
    .map(({ e }) => e);
}
