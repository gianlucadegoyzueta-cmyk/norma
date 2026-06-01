"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { normalizeEmail } from "@/server/auth/password";

export type LoginState = { error?: string };

/**
 * Accesso con email + password (provider Credentials). In caso di successo `signIn` lancia un
 * redirect (NEXT_REDIRECT) che lasciamo propagare; un `AuthError` significa credenziali errate.
 * Messaggio volutamente generico (no enumerazione: non diciamo se è l'email o la password).
 */
export async function signInWithPassword(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Inserisci email e password." };

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email o password non corretti." };
    }
    throw error; // NEXT_REDIRECT (successo) o errori reali → propaga
  }
}

/**
 * Invia un magic link e porta alla pagina "controlla la tua email". Usiamo `redirect: false` per
 * gestire noi la destinazione (così possiamo mostrare l'indirizzo e offrire il reinvio).
 */
export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Inserisci un'email valida." };

  try {
    await signIn("nodemailer", { email, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Non è stato possibile inviare il link. Riprova tra poco." };
    }
    throw error;
  }
  redirect(`/auth/check-email?email=${encodeURIComponent(email)}`);
}

/** Continua con Google (OAuth one-click). Form action diretta: lancia il redirect verso Google. */
export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/dashboard" });
}
