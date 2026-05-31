import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isGoogleEnabled } from "@/auth";
import { AuthShell } from "@/components/auth-shell";
import { getCurrentContext } from "@/server/auth/session";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Crea un account" };

export default async function SignupPage() {
  if (await getCurrentContext()) redirect("/dashboard");

  return (
    <AuthShell>
      <SignupForm googleEnabled={isGoogleEnabled} />
    </AuthShell>
  );
}
