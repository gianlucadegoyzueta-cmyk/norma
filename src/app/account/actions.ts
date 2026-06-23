"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";

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
