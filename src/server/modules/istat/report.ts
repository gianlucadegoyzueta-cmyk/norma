// Costruzione del report ISTAT mensile a partire dai dati reali (lato server: usa Prisma).
// Tiene il DOMINIO puro (aggregate/provenance) e qui fa solo: query → mapping → aggregazione.

import { prisma } from "@/server/db";
import { aggregateMonth, type IstatMonthlyReport, type IstatStayRecord } from "./domain/aggregate";
import { resolveProvenance } from "./domain/provenance";
// Helper di period UNICO del modulo ISTAT (DRY): un solo parser/validatore "YYYY-MM" per tutti i
// tracciati regionali e per il report aggregato. NON accoppiato a tourist-tax.
import { periodBounds } from "./ross1000/period";

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
  const { start, end } = periodBounds(period);

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
