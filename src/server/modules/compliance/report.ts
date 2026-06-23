// Caricamento dello "Storico compliance" mensile (lato server: usa Prisma). Tiene il DOMINIO puro
// (verdetto in domain/month.ts) e qui fa solo: query → bucket per mese → righe. Tutto filtrato per
// organizationId (isolamento tenant). Nessun campo nuovo a DB: si calcola dai dati esistenti.

import { prisma } from "@/server/db";
import {
  type MonthComplianceFigures,
  type MonthComplianceRow,
  monthBounds,
  recentMonths,
  toComplianceRow,
} from "./domain/month";

/** "YYYY-MM" (UTC) di una data: il mese di competenza è quello dell'ARRIVO del soggiorno. */
function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Carica gli ultimi `count` mesi di "posizione regolare" per un'organizzazione, dal più recente.
 * Due sole query (schedine, dichiarazioni) sull'intero intervallo, poi aggregazione in memoria.
 */
export async function loadComplianceHistory(
  organizationId: string,
  now: Date,
  count = 12,
): Promise<MonthComplianceRow[]> {
  const months = recentMonths(now, count); // dal più recente al più vecchio
  const oldest = months[months.length - 1];
  const newest = months[0];
  const rangeStart = monthBounds(oldest).start;
  const rangeEnd = monthBounds(newest).end;

  // Una riga vuota per ogni mese: i mesi senza attività restano "quiet", non spariscono.
  const figures = new Map<string, MonthComplianceFigures>(
    months.map((month) => [
      month,
      { month, schedineExpected: 0, schedineAcquired: 0, taxDeclarations: 0, taxPending: 0 },
    ]),
  );

  const [schedine, declarations] = await Promise.all([
    prisma.schedina.findMany({
      where: {
        organizationId,
        guest: { stay: { arrivalDate: { gte: rangeStart, lt: rangeEnd } } },
      },
      select: { status: true, guest: { select: { stay: { select: { arrivalDate: true } } } } },
    }),
    prisma.touristTaxDeclaration.findMany({
      where: { organizationId, period: { in: months } },
      select: { period: true, status: true },
    }),
  ]);

  for (const s of schedine) {
    const month = monthKey(s.guest.stay.arrivalDate);
    const fig = figures.get(month);
    if (!fig) continue; // arrivo su un confine fuori dai mesi richiesti
    fig.schedineExpected += 1;
    if (s.status === "ACQUIRED") fig.schedineAcquired += 1;
  }

  for (const d of declarations) {
    const fig = figures.get(d.period);
    if (!fig) continue;
    fig.taxDeclarations += 1;
    if (d.status === "DRAFT" || d.status === "READY") fig.taxPending += 1;
  }

  return months.map((month) => toComplianceRow(figures.get(month)!));
}
