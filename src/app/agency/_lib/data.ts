import "server-only";
import type { PrismaClient } from "@prisma/client";
import { OPEN_SCHEDINA_STATUSES } from "@/lib/schedina-status";
import {
  type AgencyOverview,
  buildAgencyOverview,
  type PropertyComplianceInput,
} from "@/server/modules/dashboard/agency-overview";
import { periodOf } from "@/server/modules/tourist-tax/domain/period";

/**
 * Legge da Prisma — SOLO aggregazioni, niente scrittura — le metriche per ogni immobile
 * dell'organizzazione e le passa al dominio puro `buildAgencyOverview`. Isolamento by query:
 * ogni read è filtrata per `organizationId`. Nessuna query duplicata: la sola sorgente della
 * vista d'agenzia. Tutto ciò che mostra esiste già nel prodotto (schedine, check-in, tassa,
 * Ross1000) — nessun cambio di schema.
 */
export async function getAgencyOverview(
  prisma: PrismaClient,
  orgId: string,
  now: Date = new Date(),
): Promise<AgencyOverview> {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const quarter = periodOf(now, "QUARTERLY");

  const properties = await prisma.property.findMany({
    where: { organizationId: orgId },
    select: {
      id: true,
      name: true,
      proprietario: true,
      credentialId: true,
      cinStatus: true,
      ross1000Code: true,
      comune: { select: { name: true, provincia: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (properties.length === 0) return buildAgencyOverview([]);

  // --- Schedine per immobile (overdue / pending), via guest → stay → property ---
  // Le schedine sono legate all'immobile solo attraverso l'ospite e il suo soggiorno: si
  // raggruppa in memoria sul propertyId della catena, restando dentro l'org per ogni read.
  const [overdueSchedine, pendingSchedine, arrivalsToday, quarterLines] = await Promise.all([
    prisma.schedina.findMany({
      where: {
        organizationId: orgId,
        status: { in: OPEN_SCHEDINA_STATUSES },
        deadlineAt: { lt: now },
      },
      select: { guest: { select: { stay: { select: { propertyId: true } } } } },
    }),
    prisma.schedina.findMany({
      where: { organizationId: orgId, status: { in: ["PENDING", "UNVERIFIED"] } },
      select: { guest: { select: { stay: { select: { propertyId: true } } } } },
    }),
    // Check-in attesi OGGI: arrivi del giorno senza alcun token di check-in completato.
    prisma.stay.findMany({
      where: {
        organizationId: orgId,
        arrivalDate: { gte: startOfToday, lt: endOfToday },
        checkinTokens: { none: { completedAt: { not: null } } },
      },
      select: { propertyId: true },
    }),
    // Tassa maturata nel trimestre per immobile: somma le righe di dichiarazione del periodo,
    // mappate all'immobile via lo stayId della riga.
    prisma.touristTaxDeclarationLine.findMany({
      where: { declaration: { organizationId: orgId, period: quarter } },
      select: { amountCents: true, stayId: true },
    }),
  ]);

  const overdueByProperty = countByProperty(overdueSchedine.map((s) => s.guest.stay.propertyId));
  const pendingByProperty = countByProperty(pendingSchedine.map((s) => s.guest.stay.propertyId));
  const checkinsByProperty = countByProperty(arrivalsToday.map((s) => s.propertyId));

  // stayId → propertyId per le righe tassa del trimestre (una sola read aggiuntiva, mirata).
  const lineStayIds = [...new Set(quarterLines.map((l) => l.stayId))];
  const lineStays = lineStayIds.length
    ? await prisma.stay.findMany({
        where: { id: { in: lineStayIds }, organizationId: orgId },
        select: { id: true, propertyId: true },
      })
    : [];
  const propertyByStay = new Map(lineStays.map((s) => [s.id, s.propertyId]));
  const taxByProperty = new Map<string, number>();
  for (const line of quarterLines) {
    const pid = propertyByStay.get(line.stayId);
    if (!pid) continue; // soggiorno di un'altra org (impossibile per il filtro) o rimosso
    taxByProperty.set(pid, (taxByProperty.get(pid) ?? 0) + line.amountCents);
  }

  const inputs: PropertyComplianceInput[] = properties.map((p) => ({
    propertyId: p.id,
    propertyName: p.name,
    proprietario: p.proprietario,
    comuneName: p.comune.name,
    provincia: p.comune.provincia,
    hasCredential: p.credentialId != null,
    // CIN soddisfatto se OTTENUTO o dichiarato NON necessario (entrambi sbloccano la tassa).
    hasCin: p.cinStatus === "OBTAINED" || p.cinStatus === "NOT_REQUIRED",
    schedineOverdue: overdueByProperty.get(p.id) ?? 0,
    schedinePending: pendingByProperty.get(p.id) ?? 0,
    checkinsToday: checkinsByProperty.get(p.id) ?? 0,
    taxAccruedCents: taxByProperty.get(p.id) ?? 0,
    ross1000Ready: (p.ross1000Code ?? "").trim().length > 0,
  }));

  return buildAgencyOverview(inputs);
}

function countByProperty(propertyIds: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of propertyIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
