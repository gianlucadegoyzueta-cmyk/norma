// Dominio PURO per la dashboard "Concierge MAX": aggrega eventi di sistema REALI in un
// "digest" (diario "Fatto da Norma" + conteggio "stanotte ho fatto N cose") e calcola
// l'occupazione del mese dai soggiorni. Nessuna dipendenza da Prisma/IO: input già letti
// dalle tabelle esistenti, output deterministico e testabile.

export type ConciergeEventKind =
  | "ical-sync"
  | "schedina-acquired"
  | "schedina-reconciled"
  | "istat-submitted";

/** Un fatto compiuto da Norma, già materializzato dalle tabelle (import, ricevute, ISTAT…). */
export interface ConciergeEvent {
  at: Date;
  kind: ConciergeEventKind;
  /** Testo principale, in italiano, in voce "Norma": cosa è stato fatto. */
  text: string;
  /** Frammento numerico/quantitativo da evidenziare (es. "2 nuove prenotazioni"). */
  highlight: string;
}

export interface ConciergeDigest {
  /** Quante cose Norma ha fatto nella finestra "stanotte" — alimenta l'hero. */
  thingsDone: number;
  /** Righe del diario, ordinate dal più vecchio al più recente (come il reference). */
  rows: ConciergeEvent[];
}

/**
 * Filtra gli eventi alla finestra "stanotte" (ultime `windowHours`), li ordina
 * cronologicamente e ne conta il totale. Gli eventi nel futuro o fuori finestra sono esclusi.
 */
export function buildConciergeDigest(
  events: readonly ConciergeEvent[],
  opts: { now: Date; windowHours: number },
): ConciergeDigest {
  const nowMs = opts.now.getTime();
  const cutoff = nowMs - opts.windowHours * 3_600_000;
  const rows = events
    .filter((e) => {
      const t = e.at.getTime();
      return t >= cutoff && t <= nowMs;
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  return { thingsDone: rows.length, rows };
}

/** Un soggiorno ridotto ai due estremi che servono al calcolo dell'occupazione. */
export interface OccupancyStay {
  arrivalDate: Date;
  departureDate: Date | null;
}

/** Scomposizione dell'occupazione: notti occupate, capienza e percentuale [0..100]. */
export interface OccupancyBreakdown {
  occupiedNights: number;
  capacityNights: number;
  pct: number;
}

/**
 * Scompone l'occupazione del mese nei numeri che la generano (per il drill-down del KPI):
 * notti occupate, capienza (n° immobili × giorni del mese) e percentuale arrotondata.
 * Le notti contano i giorni in [arrivo, partenza) che cadono nella finestra del mese.
 * Un soggiorno senza partenza conta una sola notte (l'arrivo). Senza immobili → tutto 0.
 */
export function occupancyBreakdown(
  stays: readonly OccupancyStay[],
  opts: { monthStart: Date; monthEnd: Date; propertyCount: number },
): OccupancyBreakdown {
  if (opts.propertyCount <= 0) return { occupiedNights: 0, capacityNights: 0, pct: 0 };
  const startMs = opts.monthStart.getTime();
  const endMs = opts.monthEnd.getTime();
  const DAY = 86_400_000;
  const monthNights = Math.round((endMs - startMs) / DAY);
  if (monthNights <= 0) return { occupiedNights: 0, capacityNights: 0, pct: 0 };

  let occupied = 0;
  for (const s of stays) {
    const a = s.arrivalDate.getTime();
    const d = s.departureDate ? s.departureDate.getTime() : a + DAY;
    // intersezione [arrivo, partenza) con [monthStart, monthEnd)
    const from = Math.max(a, startMs);
    const to = Math.min(d, endMs);
    if (to <= from) continue;
    occupied += Math.round((to - from) / DAY);
  }

  const capacity = monthNights * opts.propertyCount;
  const occupiedNights = Math.min(occupied, capacity);
  return {
    occupiedNights,
    capacityNights: capacity,
    pct: Math.round((occupiedNights / capacity) * 100),
  };
}

/**
 * Occupazione del mese in percentuale [0..100], arrotondata all'intero.
 * = notti occupate nel mese / (n° immobili × giorni del mese). Senza immobili → 0.
 */
export function occupancyPercent(
  stays: readonly OccupancyStay[],
  opts: { monthStart: Date; monthEnd: Date; propertyCount: number },
): number {
  return Math.min(100, occupancyBreakdown(stays, opts).pct);
}
