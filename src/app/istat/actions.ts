"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { toIstatCsv } from "@/server/modules/istat/domain/export-csv";
import { loadIstatReport } from "@/server/modules/istat/report";

/** Genera il CSV del report ISTAT del mese richiesto (contenuto + filename) da scaricare. */
export async function exportIstatCsvAction(
  period: string,
): Promise<{ ok: true; filename: string; content: string } | { ok: false; error: string }> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  try {
    const { report } = await loadIstatReport(ctx.current.organizationId, period);
    return { ok: true, filename: `istat_${period}.csv`, content: toIstatCsv(report) };
  } catch {
    return { ok: false, error: "Periodo non valido." };
  }
}

/**
 * Registra (o aggiorna) l'avvenuto invio ISTAT di un mese: salva totali + snapshot delle righe e la
 * data. Audit-trail; NON invia a portali esterni (quello resta manuale/da integrare).
 */
export async function markIstatSubmittedAction(
  period: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.current.organizationId;
  try {
    const { report } = await loadIstatReport(orgId, period);
    const data = {
      arriviTotal: report.totals.arrivi,
      presenzeTotal: report.totals.presenze,
      rows: report.rows as unknown as Prisma.InputJsonValue,
      submittedAt: new Date(),
    };
    await prisma.istatSubmission.upsert({
      where: { organizationId_period: { organizationId: orgId, period } },
      create: { organizationId: orgId, period, ...data },
      update: data,
    });
    revalidatePath("/istat");
    return { ok: true };
  } catch {
    return { ok: false, error: "Periodo non valido." };
  }
}
