"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { checkWriteAccess } from "@/server/modules/billing/write-access";
import { CinError, CinService, PrismaCinRepository } from "@/server/modules/cin";

type Result = { ok: boolean; message: string };

export async function saveCinAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  const cinRaw = String(formData.get("cin") ?? "").trim();
  if (!propertyId) return { ok: false, message: "Immobile non valido." };
  if (!cinRaw) return { ok: false, message: "Inserisci il CIN." };

  const service = new CinService(new PrismaCinRepository(prisma));
  try {
    await service.saveCin({
      organizationId: ctx.current.organizationId,
      propertyId,
      cinRaw,
    });
  } catch (err) {
    if (err instanceof CinError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore nel salvataggio del CIN. Riprova." };
  }

  revalidatePath("/properties");
  revalidatePath("/dashboard");
  return { ok: true, message: "CIN salvato ✓" };
}

export async function markCinNotRequiredAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  if (!propertyId) return { ok: false, message: "Immobile non valido." };

  const service = new CinService(new PrismaCinRepository(prisma));
  try {
    await service.markNotRequired({
      organizationId: ctx.current.organizationId,
      propertyId,
    });
  } catch (err) {
    if (err instanceof CinError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore nell'aggiornamento. Riprova." };
  }

  revalidatePath("/properties");
  revalidatePath("/dashboard");
  return { ok: true, message: "Segnato come non richiesto ✓" };
}
