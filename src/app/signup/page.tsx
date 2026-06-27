import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isGoogleEnabled } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentContext } from "@/server/auth/session";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Crea un account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  if (await getCurrentContext()) redirect("/dashboard");
  const sp = await searchParams;
  const redirectTo = sp.invite ? `/auth/invite?token=${encodeURIComponent(sp.invite)}` : undefined;

  return (
    <AuthShell>
      <SignupForm googleEnabled={isGoogleEnabled} redirectTo={redirectTo} />
    </AuthShell>
  );
}
