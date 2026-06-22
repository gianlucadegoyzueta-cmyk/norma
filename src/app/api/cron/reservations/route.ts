// Cron di re-sync degli import iCal (Vercel Cron). Schedule consigliato: "0 */6 * * *" (ogni 6 ore).
// DISATTIVATO di default: serve RESERVATIONS_SYNC_ENABLED=true + CRON_SECRET (bearer dal cron Vercel).
// NON invia nulla agli enti: aggiorna solo i soggiorni IN BOZZA dai feed (nuove prenotazioni / annulli).
// Bypassa la sessione (nessun getCurrentContext): itera tutti i feed via repo.listAll().

import { ICalHttpFetcher, PrismaReservationImportRepository } from "@/server/modules/reservations";
import { ReservationImportService } from "@/server/modules/reservations";
import { evaluateCronGate } from "@/server/cron/cron-gate";
import { prisma } from "@/server/db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request): Promise<Response> {
  const gate = evaluateCronGate({
    enabledFlag: process.env.RESERVATIONS_SYNC_ENABLED,
    cronSecret: process.env.CRON_SECRET,
    authHeader: req.headers.get("authorization"),
  });
  if (!gate.ok) {
    return Response.json({ ok: false, reason: gate.reason }, { status: gate.status });
  }

  try {
    const service = new ReservationImportService(
      new PrismaReservationImportRepository(prisma),
      new ICalHttpFetcher(),
    );
    const summary = await service.syncAllFeeds();
    return Response.json({ ok: true, summary });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "errore inatteso" },
      { status: 500 },
    );
  }
}
