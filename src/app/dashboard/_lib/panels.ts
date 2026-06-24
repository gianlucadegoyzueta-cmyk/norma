import "server-only";
import type { PrismaClient } from "@prisma/client";
import { loadComplianceHistory, humanMonth } from "@/server/modules/compliance";
import { occupancyBreakdown } from "@/server/modules/dashboard/concierge-digest";
import type { PropertyStatus } from "@/components/dashboard/concierge-properties";
import type { ComplianceMonth } from "@/components/dashboard/concierge-compliance";

/** Iniziali dei mesi IT (gennaio..dicembre) per lo strip compliance. */
const MONTH_INITIALS = ["G", "F", "M", "A", "M", "G", "L", "A", "S", "O", "N", "D"];

export interface DashboardPanels {
  properties: PropertyStatus[];
  compliance: { months: ComplianceMonth[]; summary: string };
}

/**
 * Dati dei due pannelli "densità" della dashboard (Concierge MAX v2): stato per-struttura e
 * posizione compliance a 12 mesi. Separato da `getDashboardData` per non toccarne il percorso:
 * solo letture aggregate, tutto già esistente nel prodotto (property, stay, schedina, compliance).
 */
export async function getDashboardPanels(
  prisma: PrismaClient,
  orgId: string,
  now: Date = new Date(),
): Promise<DashboardPanels> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [props, history, pending] = await Promise.all([
    prisma.property.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        comune: { select: { name: true } },
        stays: {
          where: {
            arrivalDate: { lt: monthEnd },
            OR: [{ departureDate: { gt: monthStart } }, { departureDate: null }],
          },
          select: { arrivalDate: true, departureDate: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    loadComplianceHistory(orgId, now, 12),
    prisma.schedina.findMany({
      where: { organizationId: orgId, status: { in: ["PENDING", "UNVERIFIED"] } },
      select: { deadlineAt: true, guest: { select: { stay: { select: { propertyId: true } } } } },
    }),
  ]);

  // Schedine in attesa raggruppate per struttura (Schedina → Guest → Stay → propertyId).
  const pendingByProp = new Map<string, number>();
  const overdueByProp = new Set<string>();
  for (const s of pending) {
    const pid = s.guest?.stay?.propertyId;
    if (!pid) continue;
    pendingByProp.set(pid, (pendingByProp.get(pid) ?? 0) + 1);
    if (s.deadlineAt < now) overdueByProp.add(pid);
  }

  const properties: PropertyStatus[] = props.map((p) => {
    const occ = occupancyBreakdown(p.stays, { monthStart, monthEnd, propertyCount: 1 });
    const pendingCount = pendingByProp.get(p.id) ?? 0;
    const overdue = overdueByProp.has(p.id);
    return {
      id: p.id,
      name: p.name,
      city: p.comune.name,
      occupancyPct: Math.min(100, occ.pct),
      pendingSchedine: pendingCount,
      status: overdue ? "err" : pendingCount > 0 ? "wait" : "ok",
      nextLabel: pendingCount > 0 ? undefined : "in regola",
    };
  });

  // `loadComplianceHistory` torna dal più recente al più vecchio → in ordine cronologico per lo strip.
  const chrono = [...history].reverse();
  const months: ComplianceMonth[] = chrono.map((r) => {
    const monthIdx = Number(r.month.split("-")[1]) - 1;
    const label =
      r.verdict === "regular"
        ? "in regola"
        : r.verdict === "attention"
          ? "da sistemare"
          : "nessun movimento";
    return {
      label: MONTH_INITIALS[monthIdx] ?? "·",
      status: r.verdict,
      title: `${humanMonth(r.month)} · ${label}`,
    };
  });
  const tracked = chrono.filter((r) => r.verdict !== "quiet");
  const allRegular = tracked.length > 0 && tracked.every((r) => r.verdict === "regular");
  const summary =
    tracked.length === 0
      ? "appena registri il primo ospite, comincio a riempirlo"
      : allRegular
        ? "tutti i mesi con movimento in regola"
        : "alcuni mesi hanno pendenze da chiudere";

  return { properties, compliance: { months, summary } };
}
