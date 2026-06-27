"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { checkWriteAccess } from "@/server/modules/billing/write-access";
import { toIstatCsv } from "@/server/modules/istat/domain/export-csv";
import { loadIstatReport } from "@/server/modules/istat/report";
import { loadRoss1000Report } from "@/server/modules/istat/ross1000/report";
import { loadSpotReport } from "@/server/modules/istat/spot/report";
import { loadUmbriaReport } from "@/server/modules/istat/umbria/report";
import { buildStoredZip } from "@/server/modules/istat/umbria/zip";

/** Esito comune degli export per-struttura: file pronto, oppure dati mancanti (mai inventati). */
type MissingField = { field: string; scope: string; refId?: string };

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
  const access = await checkWriteAccess(orgId);
  if (!access.ok) return { ok: false, error: access.message };
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

/**
 * Genera il file XML Ross1000 (movimento turistico) di UNA struttura per il mese richiesto.
 * Canale FILE_EXPORT: l'operatore scarica il file e lo carica al portale regionale (Ross1000 copre
 * ~13 regioni). Se mancano dati obbligatori ritorna l'elenco `missing` — il tracciato NON accetta
 * dati inventati, quindi non si genera nulla finché il report non è completo.
 */
export async function exportRoss1000XmlAction(
  propertyId: string,
  period: string,
): Promise<
  | { ok: true; filename: string; content: string }
  | { ok: false; error: string; missing?: MissingField[] }
> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  try {
    const out = await loadRoss1000Report(prisma, {
      organizationId: ctx.current.organizationId,
      propertyId,
      period,
    });
    if (out.kind === "OK") {
      return { ok: true, filename: `movimento_${period}.xml`, content: out.xml };
    }
    return {
      ok: false,
      error: "Report incompleto: completa i dati mancanti prima di generare il file.",
      missing: out.missing,
    };
  } catch {
    return { ok: false, error: "Periodo non valido." };
  }
}

/**
 * Genera il file XML SPOT (Puglia) di UNA struttura per il mese. Stesso canale FILE_EXPORT del
 * Ross1000: l'operatore scarica e carica al portale InnovaPuglia. Se mancano dati → `missing`, niente file.
 */
export async function exportSpotXmlAction(
  propertyId: string,
  period: string,
): Promise<
  | { ok: true; filename: string; content: string }
  | { ok: false; error: string; missing?: MissingField[] }
> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  try {
    const out = await loadSpotReport(prisma, {
      organizationId: ctx.current.organizationId,
      propertyId,
      period,
    });
    if (out.kind === "OK") {
      return { ok: true, filename: `movimento_spot_${period}.xml`, content: out.xml };
    }
    return {
      ok: false,
      error: "Report incompleto: completa i dati mancanti prima di generare il file.",
      missing: out.missing,
    };
  } catch {
    return { ok: false, error: "Periodo non valido." };
  }
}

/**
 * Genera il tracciato Turismatica C/59 (Umbria) di UNA struttura per il mese: un file .txt PER GIORNO.
 * Li impacchetta in un solo ZIP (STORE, encoder puro) trasportato in base64; il client ricostruisce il
 * Blob `application/zip` da scaricare. Canale FILE_EXPORT (upload manuale via SPID). Mancano dati → niente file.
 */
export async function exportUmbriaC59Action(
  propertyId: string,
  period: string,
): Promise<
  | { ok: true; filename: string; base64: string }
  | { ok: false; error: string; missing?: MissingField[] }
> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  try {
    const out = await loadUmbriaReport(prisma, {
      organizationId: ctx.current.organizationId,
      propertyId,
      period,
    });
    if (out.kind === "OK") {
      const zip = buildStoredZip(out.files);
      return {
        ok: true,
        filename: `movimento_umbria_${period}.zip`,
        base64: Buffer.from(zip).toString("base64"),
      };
    }
    return {
      ok: false,
      error: "Report incompleto: completa i dati mancanti prima di generare il file.",
      missing: out.missing,
    };
  } catch {
    return { ok: false, error: "Periodo non valido." };
  }
}
