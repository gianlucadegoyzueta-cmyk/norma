import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isGoogleEnabled } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentContext } from "@/server/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Accedi" };

const NOTICES: Record<string, string> = {
  registered: "Account creato. Accedi pure con le tue credenziali.",
  reset: "Password aggiornata. Accedi con la nuova password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; reset?: string; invite?: string }>;
}) {
  // Chi è già autenticato non deve vedere il login.
  if (await getCurrentContext()) redirect("/dashboard");

  const sp = await searchParams;
  const notice = sp.registered ? NOTICES.registered : sp.reset ? NOTICES.reset : undefined;
  const redirectTo = sp.invite ? `/auth/invite?token=${encodeURIComponent(sp.invite)}` : undefined;

  return (
    <AuthShell>
      <LoginForm googleEnabled={isGoogleEnabled} notice={notice} redirectTo={redirectTo} />
    </AuthShell>
  );
}
