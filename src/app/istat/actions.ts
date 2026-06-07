"use server";

import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
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
