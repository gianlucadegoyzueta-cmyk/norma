// Costruzione del report ISTAT mensile a partire dai dati reali (lato server: usa Prisma).
// Tiene il DOMINIO puro (aggregate/provenance) e qui fa solo: query → mapping → aggregazione.

import { prisma } from "@/server/db";
import { aggregateMonth, type IstatMonthlyReport, type IstatStayRecord } from "./domain/aggregate";
import { resolveProvenance } from "./domain/provenance";

const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Confini del mese (UTC) come Date: [start, end). */
function monthBounds(period: string): { start: Date; end: Date } {
  const m = PERIOD_RE.exec(period);
  if (!m) throw new Error(`Periodo ISTAT non valido (atteso YYYY-MM): ${period}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}

export interface IstatReportResult {
  report: IstatMonthlyReport;
  /** Quante presenze hanno provenienza APPROSSIMATA (dedotta dalla cittadinanza per residenza mancante). */
  approximated: number;
  /** Numero di ospiti considerati (candidati del mese). */
  guestsConsidered: number;
}

/**
 * Carica e aggrega il movimento del mese per un'organizzazione. Considera gli ospiti il cui
 * soggiorno interseca il mese; la conta esatta di arrivi/presenze la fa `aggregateMonth`.
 */
export async function loadIstatReport(
  organizationId: string,
  period: string,
): Promise<IstatReportResult> {
  const { start, end } = monthBounds(period);

  const guests = await prisma.guest.findMany({
    where: {
      organizationId,
      stay: {
        arrivalDate: { lt: end },
        OR: [{ departureDate: null }, { departureDate: { gte: start } }],
      },
    },
    select: {
      stay: { select: { arrivalDate: true, departureDate: true } },
      residenceComune: { select: { provincia: true } },
      residenceCountry: { select: { code: true, name: true } },
      citizenship: { select: { code: true, name: true } },
    },
  });

  let approximated = 0;
  const records: IstatStayRecord[] = guests.map((g) => {
    const resolved = resolveProvenance({
      residenceComune: g.residenceComune,
      residenceCountry: g.residenceCountry,
      citizenship: g.citizenship,
    });
    if (resolved.approximated) approximated += 1;
    return {
      arrival: g.stay.arrivalDate,
      departure: g.stay.departureDate,
      provenance: resolved.provenance,
    };
  });

  return { report: aggregateMonth(period, records), approximated, guestsConsidered: guests.length };
}

/** Mese corrente come "YYYY-MM" (UTC). Default del selettore quando non c'è ?period. */
export function currentPeriod(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
