"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { PrismaAuthRepository } from "@/server/auth/adapters/PrismaAuthRepository";
import { hashPassword, normalizeEmail, validatePassword } from "@/server/auth/password";
import { provisionNewUser } from "@/server/auth/provisioning";
import { prisma } from "@/server/db";

export type SignupState = { error?: string };

/**
 * Registrazione email + password:
 *  1. valida nome, email e password (regole chiare, messaggi in italiano);
 *  2. crea l'utente con `passwordHash` (mai la password in chiaro);
 *  3. esegue il provisioning dell'Organization col NOME REALE scelto (niente "Organizzazione di…");
 *  4. MVP: login immediato post-registrazione (scelta documentata nel CHANGELOG).
 *
 * NB: la verifica email è "predisposta" (campo emailVerified resta null e l'utente può sempre
 * validare in futuro) ma NON blocca l'accesso — coerente con la scelta MVP.
 */
export async function registerWithPassword(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const name = String(formData.get("name") ?? "").trim();
  const organizationName = String(formData.get("organizationName") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Inserisci il tuo nome." };
  if (!email) return { error: "Inserisci un'email valida." };
  const pwError = validatePassword(password);
  if (pwError) return { error: pwError };

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: "Esiste già un account con questa email. Prova ad accedere." };
  }

  const passwordHash = await hashPassword(password);
  let userId: string;
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true },
    });
    userId = user.id;
  } catch {
    return { error: "Non è stato possibile creare l'account. Riprova." };
  }

  // Provisioning esplicito (Credentials bypassa l'adapter → l'evento createUser non scatta qui).
  await provisionNewUser(
    { id: userId, email, organizationName: organizationName || null },
    new PrismaAuthRepository(prisma),
  );

  try {
    await signIn("credentials", { email, password, redirectTo: "/onboarding" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      // Account creato ma auto-login fallito (raro): mandiamo al login con avviso.
      redirect("/login?registered=1");
    }
    throw error; // NEXT_REDIRECT (successo) → propaga
  }
}
