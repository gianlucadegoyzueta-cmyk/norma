// Cron mensile movimento turistico (Vercel Cron). Schedule consigliato: "0 9 5 * *" (5 del mese).
// DISATTIVATO di default: serve ISTAT_CRON_ENABLED=true + CRON_SECRET (Vercel invia il bearer).
// NON invia nulla agli enti: prepara e manda all'host una email (file pronto / dati mancanti).
// Bypassa la sessione (nessun getCurrentContext): itera le strutture via Prisma, auth via CRON_SECRET.

import { prisma } from "@/server/db";
import { evaluateCronGate } from "@/server/cron/cron-gate";
import { ResendEmailSender } from "@/server/modules/notifications";
import { loadRoss1000Report } from "@/server/modules/istat/ross1000/report";
import { loadSpotReport } from "@/server/modules/istat/spot/report";
import { loadUmbriaReport } from "@/server/modules/istat/umbria/report";
import {
  runMonthlyIstatReminders,
  type ReminderProperty,
} from "@/server/modules/istat/services/istat-reminder.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request): Promise<Response> {
  const gate = evaluateCronGate({
    enabledFlag: process.env.ISTAT_CRON_ENABLED,
    cronSecret: process.env.CRON_SECRET,
    authHeader: req.headers.get("authorization"),
  });
  if (!gate.ok) {
    return Response.json({ ok: false, reason: gate.reason }, { status: gate.status });
  }

  try {
    const email = new ResendEmailSender();
    const result = await runMonthlyIstatReminders(
      {
        listProperties: async (): Promise<ReminderProperty[]> => {
          const rows = await prisma.property.findMany({
            select: {
              id: true,
              name: true,
              organizationId: true,
              comune: { select: { provincia: true } },
              organization: {
                select: {
                  memberships: {
                    where: { role: "OWNER" },
                    select: { user: { select: { email: true } } },
                    take: 1,
                  },
                },
              },
            },
          });
          return rows.map((r) => ({
            organizationId: r.organizationId,
            propertyId: r.id,
            name: r.name,
            provincia: r.comune?.provincia ?? null,
            ownerEmail: r.organization.memberships[0]?.user?.email ?? null,
          }));
        },
        loadReport: (serializerId, ids, period) => {
          const args = {
            organizationId: ids.organizationId,
            propertyId: ids.propertyId,
            period,
          };
          switch (serializerId) {
            case "ross1000-xml":
              return loadRoss1000Report(prisma, args);
            case "spot-xml":
              return loadSpotReport(prisma, args);
            case "turismatica-c59":
              return loadUmbriaReport(prisma, args);
          }
        },
        email,
      },
      new Date(),
    );

    return Response.json({ ok: true, ...result });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "errore inatteso" },
      { status: 500 },
    );
  }
}
