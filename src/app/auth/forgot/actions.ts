"use server";

import { appBaseUrl, sendTransactionalEmail } from "@/server/auth/email";
import { normalizeEmail } from "@/server/auth/password";
import { createPasswordResetToken } from "@/server/auth/password-reset";
import { prisma } from "@/server/db";

export type ForgotState = { sent?: boolean; error?: string };

/**
 * Richiesta di reset password. ANTI-ENUMERAZIONE: la risposta è identica sia che l'email esista
 * o meno (`sent: true`), così non si può scoprire chi è registrato. L'email parte solo se l'utente
 * esiste. Nota: funziona anche per utenti senza password (magic link/Google) → è un modo pulito per
 * impostare una password la prima volta.
 */
export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Inserisci un'email valida." };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const token = await createPasswordResetToken(user.id);
    const url = `${appBaseUrl()}/auth/reset?token=${token}`;
    try {
      await sendTransactionalEmail({
        to: email,
        subject: "Reimposta la tua password — Norma",
        text:
          `Hai chiesto di reimpostare la password del tuo account Norma.\n\n` +
          `Apri questo link (valido 30 minuti):\n${url}\n\n` +
          `Se non sei stato tu, ignora pure questa email: la tua password resta invariata.`,
      });
    } catch {
      // Best-effort: non riveliamo errori d'invio per non distinguere gli account esistenti.
    }
  }

  return { sent: true };
}
