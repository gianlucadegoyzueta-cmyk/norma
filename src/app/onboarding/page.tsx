import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaCredentialRepository } from "@/server/modules/alloggiati";
import { computeCurrentStep, loadProgress } from "@/server/modules/onboarding/progress";
import { getOnboardingState } from "@/server/modules/onboarding/state";
import { PrismaPropertyRepository } from "@/server/modules/properties";
import { OnboardingWizard } from "./OnboardingWizard";

export const metadata: Metadata = { title: "Configurazione" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.current.organizationId;

  const [state, progress] = await Promise.all([
    getOnboardingState(prisma, orgId),
    loadProgress(prisma, orgId),
  ]);

  // Onboarding già concluso → dritto in dashboard (rientro curato, Fase D).
  if (progress?.completedAt && state.ready) redirect("/dashboard");

  // Step iniziale = primo passo non completato (ripresa refresh-safe).
  const initialStep = computeCurrentStep(progress, state);

  // Dati per lo step "Primo immobile": credenziali utilizzabili + Comuni delle loro province.
  const allCredentials = await new PrismaCredentialRepository(prisma).listByOrganization(orgId);
  const credentials = allCredentials
    .filter((c) => c.status !== "DISABLED")
    .map((c) => ({ id: c.id, label: c.label, provincia: c.provincia }));
  const province = [...new Set(credentials.map((c) => c.provincia))];
  const comuni = province.length
    ? await new PrismaPropertyRepository(prisma).listSelectableComuni(province)
    : [];

  return (
    <OnboardingWizard
      initialStep={initialStep}
      user={{ name: ctx.user.name, email: ctx.user.email }}
      organizationName={ctx.current.organizationName}
      progress={{
        userType: progress?.userType ?? null,
        structuresCount: progress?.structuresCount ?? null,
      }}
      credentials={credentials}
      comuni={comuni}
    />
  );
}
