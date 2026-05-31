"use server";

import { redirect } from "next/navigation";
import { hashPassword, validatePassword } from "@/server/auth/password";
import { consumePasswordResetToken } from "@/server/auth/password-reset";
import { prisma } from "@/server/db";

export type ResetState = { error?: string };

/**
 * Imposta una nuova password a partire da un token di reset. Il token viene CONSUMATO (monouso)
 * prima dell'aggiornamento; se è scaduto/già usato si chiede di ripartire. In caso di successo si
 * torna al login con un avviso di conferma.
 */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) return { error: "Link non valido. Richiedi un nuovo reset." };
  const pwError = validatePassword(password);
  if (pwError) return { error: pwError };
  if (password !== confirm) return { error: "Le due password non coincidono." };

  const consumed = await consumePasswordResetToken(token);
  if (!consumed) return { error: "Link scaduto o già usato. Richiedi un nuovo reset." };

  const passwordHash = await hashPassword(password);
  await prisma.user.update({ where: { id: consumed.userId }, data: { passwordHash } });

  redirect("/login?reset=1");
}
