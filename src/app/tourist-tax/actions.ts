"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TaxDeclarationStatus, TaxRemittanceMode } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { cinForDeclarationExport } from "@/server/modules/cin/domain/cin";
import { periodLabel } from "@/server/modules/tourist-tax/domain/period";
import { toDeclarationPdf } from "@/server/modules/tourist-tax/domain/export-pdf";
import { PrismaTouristTaxConfigRepository } from "@/server/modules/tourist-tax/adapters/PrismaTouristTaxConfigRepository";
import { PrismaTouristTaxDeclarationRepository } from "@/server/modules/tourist-tax/adapters/PrismaTouristTaxDeclarationRepository";
import { TouristTaxDeclarationService } from "@/server/modules/tourist-tax/services/declaration.service";
import { resolveRemittanceChannel } from "@/server/modules/tourist-tax/adapters/remittance/resolver";
import type { RemittanceResult } from "@/server/modules/tourist-tax/ports/RemittanceChannel";

function service() {
  return new TouristTaxDeclarationService(
    new PrismaTouristTaxDeclarationRepository(prisma),
    new PrismaTouristTaxConfigRepository(prisma),
  );
}

const STATUSES: TaxDeclarationStatus[] = ["DRAFT", "READY", "SUBMITTED", "PAID", "CANCELLED"];
const MODES: TaxRemittanceMode[] = ["MANUAL_EXPORT", "GECOS", "PAGOPA", "COMUNE_PORTAL"];
const PERIOD_RE = /^\d{4}(-\d{2}|-Q[1-4])?$/;

/** Costruisce/ricalcola la dichiarazione di un comune per un periodo. */
export async function buildDeclarationAction(formData: FormData) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.current.organizationId;

  const comuneId = String(formData.get("comuneId") ?? "");
  const period = String(formData.get("period") ?? "").trim();
  if (!comuneId) return { ok: false as const, error: "Seleziona un comune." };
  if (!PERIOD_RE.test(period))
    return { ok: false as const, error: "Periodo non valido (es. 2026-05, 2026-Q2, 2026)." };

  const out = await service().buildOrRecompute({ organizationId: orgId, comuneId, period });
  revalidatePath("/tourist-tax");
  if (out.kind === "NO_RULE")
    return {
      ok: false as const,
      error: "Nessuna regola configurata per questo comune nel periodo.",
    };
  if (out.kind === "LOCKED")
    return { ok: false as const, error: `Dichiarazione ${out.status}: non più ricalcolabile.` };
  return { ok: true as const, staysCount: out.staysCount, skipped: out.skippedNoRule };
}

/** Cambia lo stato della dichiarazione (transizione validata nel dominio). */
export async function changeDeclarationStatusAction(formData: FormData) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "") as TaxDeclarationStatus;
  if (!id || !STATUSES.includes(to)) return { ok: false as const, error: "Dati non validi" };
  try {
    await service().changeStatus(id, ctx.current.organizationId, to);
  } catch {
    return { ok: false as const, error: "Transizione non consentita." };
  }
  revalidatePath("/tourist-tax");
  return { ok: true as const };
}

/** Imposta la modalità di versamento scelta dall'utente. */
export async function setRemittanceModeAction(formData: FormData) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const id = String(formData.get("id") ?? "");
  const mode = String(formData.get("mode") ?? "") as TaxRemittanceMode;
  if (!id || !MODES.includes(mode)) return { ok: false as const, error: "Dati non validi" };
  await service().setRemittanceMode(id, ctx.current.organizationId, mode);
  revalidatePath("/tourist-tax");
  return { ok: true as const };
}

/**
 * Carica i dati di export di una dichiarazione (intestazione + righe con CIN per immobile).
 * Condiviso da export CSV (canale di versamento) ed export PDF. Nessun cambio di schema:
 * Property.cin esiste già; il CIN è risolto per riga solo se conforme (cinForDeclarationExport).
 * Ritorna null se la dichiarazione non esiste per questa organizzazione.
 */
async function loadDeclarationExport(declarationId: string, orgId: string) {
  const declRepo = new PrismaTouristTaxDeclarationRepository(prisma);
  const decl = await declRepo.getDeclaration(declarationId, orgId);
  if (!decl) return null;

  const comune = await prisma.comune.findUnique({
    where: { id: decl.comuneId },
    select: { name: true },
  });
  const lines = await declRepo.getDeclarationLines(declarationId, orgId);

  const stays = await prisma.stay.findMany({
    where: { id: { in: lines.map((l) => l.stayId) }, organizationId: orgId },
    select: { id: true, property: { select: { cin: true, cinStatus: true } } },
  });
  const cinByStay = new Map(
    stays.map((s) => [
      s.id,
      cinForDeclarationExport({ cin: s.property.cin, cinStatus: s.property.cinStatus }),
    ]),
  );

  const exportData = {
    comuneName: comune?.name ?? decl.comuneId,
    periodLabel: periodLabel(decl.period),
    totalCents: decl.amountCents,
    lines: lines.map((l) => ({
      propertyName: l.propertyName,
      cin: cinByStay.get(l.stayId) ?? null,
      stayId: l.stayId,
      taxedNights: l.taxedNights,
      amountCents: l.amountCents,
    })),
  };
  return { decl, exportData };
}

/** Nome file sicuro per gli export, es. `tassa-soggiorno_roma_maggio-2026`. */
function exportBasename(comuneName: string, period: string): string {
  const safe = (s: string) => s.replace(/\s+/g, "_").toLowerCase();
  return `tassa-soggiorno_${safe(comuneName)}_${safe(period)}`;
}

/**
 * Prepara il versamento secondo la modalità salvata: per MANUAL_EXPORT ritorna il CSV (contenuto +
 * filename) da scaricare; per i canali stub ritorna NOT_IMPLEMENTED.
 */
export async function prepareRemittanceAction(
  declarationId: string,
): Promise<{ ok: true; result: RemittanceResult } | { ok: false; error: string }> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.current.organizationId;

  const loaded = await loadDeclarationExport(declarationId, orgId);
  if (!loaded) return { ok: false, error: "Dichiarazione non trovata" };

  const channel = resolveRemittanceChannel(loaded.decl.remittanceMode);
  const result = await channel.prepare({
    declarationId,
    organizationId: orgId,
    exportData: loaded.exportData,
  });
  return { ok: true, result };
}

/**
 * Genera il PDF della dichiarazione (sempre disponibile, indipendente dalla modalità di versamento):
 * ritorna i byte come base64 + filename, che il client scarica come file .pdf.
 */
export async function prepareDeclarationPdfAction(
  declarationId: string,
): Promise<{ ok: true; filename: string; base64: string } | { ok: false; error: string }> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.current.organizationId;

  const loaded = await loadDeclarationExport(declarationId, orgId);
  if (!loaded) return { ok: false, error: "Dichiarazione non trovata" };

  const bytes = await toDeclarationPdf(loaded.exportData);
  const base64 = Buffer.from(bytes).toString("base64");
  const filename = `${exportBasename(loaded.exportData.comuneName, loaded.exportData.periodLabel)}.pdf`;
  return { ok: true, filename, base64 };
}
