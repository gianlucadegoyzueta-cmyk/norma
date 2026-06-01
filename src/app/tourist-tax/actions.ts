"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TaxDeclarationStatus, TaxRemittanceMode } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { periodLabel } from "@/server/modules/tourist-tax/domain/period";
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
 * Prepara il versamento secondo la modalità salvata: per MANUAL_EXPORT ritorna il CSV (contenuto +
 * filename) da scaricare; per i canali stub ritorna NOT_IMPLEMENTED.
 */
export async function prepareRemittanceAction(
  declarationId: string,
): Promise<{ ok: true; result: RemittanceResult } | { ok: false; error: string }> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.current.organizationId;

  const declRepo = new PrismaTouristTaxDeclarationRepository(prisma);
  const decl = await declRepo.getDeclaration(declarationId, orgId);
  if (!decl) return { ok: false, error: "Dichiarazione non trovata" };

  const comune = await prisma.comune.findUnique({
    where: { id: decl.comuneId },
    select: { name: true },
  });
  const lines = await declRepo.getDeclarationLines(declarationId, orgId);

  const channel = resolveRemittanceChannel(decl.remittanceMode);
  const result = await channel.prepare({
    declarationId,
    organizationId: orgId,
    exportData: {
      comuneName: comune?.name ?? decl.comuneId,
      periodLabel: periodLabel(decl.period),
      totalCents: decl.amountCents,
      lines: lines.map((l) => ({
        propertyName: l.propertyName,
        stayId: l.stayId,
        taxedNights: l.taxedNights,
        amountCents: l.amountCents,
      })),
    },
  });
  return { ok: true, result };
}
