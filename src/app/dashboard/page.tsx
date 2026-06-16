import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getOnboardingState } from "@/server/modules/onboarding/state";
import { LogOut } from "lucide-react";
import { ConciergeScene } from "@/components/dashboard/concierge-scene";
import { getDashboardData, type DashboardProposal } from "./_lib/data";
import { buildSceneCopy } from "./_lib/scene";
import "./concierge.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.current.organizationId;
  const now = new Date();
  const [data, onboarding] = await Promise.all([
    getDashboardData(prisma, orgId),
    getOnboardingState(prisma, orgId),
  ]);

  // Primo nome REALE dell'utente: se manca (solo email), saluto elegante senza nome.
  const rawName = ctx.user.name?.trim();
  const firstName = rawName ? rawName.split(/\s+/)[0] : null;

  // Onboarding incompleto = prima proposta (azione reale: vai al wizard), poi le proposte sui dati.
  const proposals: DashboardProposal[] = [];
  if (!onboarding.ready) {
    proposals.push({
      id: "onboarding",
      emoji: "🪶",
      bold: `Configurazione al ${Math.round((onboarding.completed / onboarding.total) * 100)}%.`,
      rest: ` ${onboarding.completed} di ${onboarding.total} passi completati. Finisci e comincio a lavorare le tue schedine.`,
      meta: "tre domande e partiamo",
      primary: {
        label: "Completa la configurazione",
        action: { type: "link", href: "/onboarding" },
      },
      doneText: "Onboarding aperto",
    });
  }
  proposals.push(...data.proposals);

  const copy = buildSceneCopy(data, { firstName, now, proposals });

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <ConciergeScene
      orgName={ctx.current.organizationName}
      lastCheck={copy.lastCheck}
      kicker={copy.kicker}
      lines={copy.lines}
      sub={copy.sub}
      kpis={copy.kpis}
      proposals={proposals}
      agenda={data.agenda}
      diary={data.diary}
      signOutSlot={
        <form action={signOutAction}>
          <button
            type="submit"
            className="bg-card text-muted-foreground hover:text-foreground flex h-9 items-center gap-1.5 rounded-lg border border-[var(--brand-hairline)] px-3 text-[13px] font-medium transition-colors"
          >
            <LogOut className="size-4" />
            Esci
          </button>
        </form>
      }
    />
  );
}
