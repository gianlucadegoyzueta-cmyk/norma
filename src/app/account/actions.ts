"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { isPillar, PrismaNotificationPreferenceRepository } from "@/server/modules/notifications";

export type ProfileState = { ok: boolean; message: string } | null;

/** Aggiorna il nome dell'utente corrente. Write minimale e sicuro (nessun dato sensibile). */
export async function updateNameAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return { ok: false, message: "Il nome non può essere vuoto." };
  if (name.length > 120) return { ok: false, message: "Nome troppo lungo (max 120 caratteri)." };

  await prisma.user.update({ where: { id: ctx.user.id }, data: { name } });
  revalidatePath("/account");
  return { ok: true, message: "Nome aggiornato ✓" };
}

/**
 * Imposta il consenso alle notifiche push per un singolo pilastro (Alloggiati o Turismo).
 * Granulare e revocabile (safeguard #1): l'host può spegnere un pilastro senza toccare l'altro.
 * Degrada in modo sicuro se la migrazione `NotificationPreference` non è ancora applicata.
 */
export async function setNotificationPreferenceAction(
  pillar: string,
  enabled: boolean,
): Promise<ProfileState> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  if (!isPillar(pillar)) return { ok: false, message: "Pilastro non valido." };

  const repo = new PrismaNotificationPreferenceRepository(prisma);
  await repo.set(ctx.user.id, pillar, enabled);
  revalidatePath("/account");
  return { ok: true, message: "Preferenza aggiornata ✓" };
}
