import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BedDouble,
  Building2,
  ChevronRight,
  FileText,
  KeyRound,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { signOut } from "@/auth";
import { CURRENT_ORG_COOKIE, getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { CinService, PrismaCinRepository } from "@/server/modules/cin";
import { getOnboardingState } from "@/server/modules/onboarding/state";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OPEN_SCHEDINA_STATUSES } from "@/lib/schedina-status";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  // Stato di configurazione (derivato dai dati): mostra il promemoria finché non è completo.
  const onboarding = await getOnboardingState(prisma, ctx.current.organizationId);
  const cinCompliance = await new CinService(new PrismaCinRepository(prisma)).getComplianceSummary(
    ctx.current.organizationId,
  );

  // Schedine OLTRE SCADENZA (aperte con deadline passata): è il rischio legale più urgente, quindi
  // l'alert precede tutto. Conteggio a livello DB (usa gli indici status/deadlineAt), niente cambi al dominio.
  const overdueCount = await prisma.schedina.count({
    where: {
      organizationId: ctx.current.organizationId,
      status: { in: OPEN_SCHEDINA_STATUSES },
      deadlineAt: { lt: new Date() },
    },
  });

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="min-h-dvh">
      <SiteHeader
        actions={
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut aria-hidden />
              Esci
            </Button>
          </form>
        }
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-4 py-8 outline-none sm:px-6 sm:py-10"
      >
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Ciao, {ctx.user.name ?? ctx.user.email ?? "utente"}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
              <Building2 className="size-4" aria-hidden />
              {ctx.current.organizationName}
              <Badge variant="secondary">{ctx.current.role}</Badge>
            </p>
          </div>
        </div>

        {overdueCount > 0 && (
          <Link
            href="/schedine"
            className="group focus-visible:ring-ring mb-6 block rounded-xl outline-none focus-visible:ring-2"
          >
            <Card className="border-destructive/40 bg-destructive/5 transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-destructive/12 text-destructive flex size-10 shrink-0 items-center justify-center rounded-lg">
                      <AlertTriangle className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <CardTitle className="text-destructive text-base">
                        {overdueCount}{" "}
                        {overdueCount === 1 ? "schedina oltre scadenza" : "schedine oltre scadenza"}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Vanno gestite subito: una comunicazione tardiva ad Alloggiati è una
                        violazione.
                      </CardDescription>
                    </div>
                  </div>
                  <span className="text-destructive inline-flex shrink-0 items-center gap-1 text-sm font-medium">
                    Apri
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}

        {!onboarding.ready && (
          <Link href="/onboarding" className="group mb-6 block">
            <Card className="border-primary/40 bg-primary/3 transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="text-base">Completa la configurazione</CardTitle>
                    <CardDescription className="mt-1">
                      {onboarding.completed} di {onboarding.total} passi completati. Finisci per
                      iniziare a inviare le schedine.
                    </CardDescription>
                  </div>
                  <span className="text-primary inline-flex shrink-0 items-center gap-1 text-sm font-medium">
                    Continua
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </div>
                <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${(onboarding.completed / onboarding.total) * 100}%` }}
                  />
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}

        {cinCompliance.count > 0 && (
          <Link href="/properties" className="group mb-6 block">
            <Card className="border-warning/50 bg-warning/5 transition-shadow hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShieldAlert className="text-warning size-4 shrink-0" />
                      {cinCompliance.count === 1
                        ? "1 immobile senza CIN"
                        : `${cinCompliance.count} immobili senza CIN`}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Il Codice Identificativo Nazionale va ottenuto sul portale BDSR e inserito per
                      ogni struttura. È obbligatorio esporlo negli annunci.
                    </CardDescription>
                  </div>
                  <span className="text-warning inline-flex shrink-0 items-center gap-1 text-sm font-medium">
                    Inserisci
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </CardHeader>
            </Card>
          </Link>
        )}

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/credentials"
            className="group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <KeyRound className="size-5" aria-hidden />
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5"
                  />
                </div>
                <CardTitle className="mt-2">Credenziali Alloggiati</CardTitle>
                <CardDescription>
                  Gestisci le credenziali Alloggiati Web, salvate cifrate nel vault e verificate in
                  tempo reale.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link
            href="/properties"
            className="group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <Building2 className="size-5" aria-hidden />
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5"
                  />
                </div>
                <CardTitle className="mt-2">Immobili</CardTitle>
                <CardDescription>
                  Registra gli immobili e collegali a una credenziale Alloggiati per l&apos;invio
                  delle schedine.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link
            href="/stays"
            className="group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <BedDouble className="size-5" aria-hidden />
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5"
                  />
                </div>
                <CardTitle className="mt-2">Soggiorni</CardTitle>
                <CardDescription>
                  Registra i soggiorni e gli ospiti; da qui genererai le schedine per Alloggiati.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link
            href="/schedine"
            className="group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <FileText className="size-5" aria-hidden />
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5"
                  />
                </div>
                <CardTitle className="mt-2">Schedine</CardTitle>
                <CardDescription>
                  L&apos;outbox degli invii: stato delle schedine e scadenze, le più urgenti in
                  cima.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </section>

        {ctx.organizations.length > 1 && (
          <section className="mt-10">
            <h2 className="text-muted-foreground mb-3 text-sm font-medium">
              Cambia organizzazione
            </h2>
            <div className="flex flex-wrap gap-2">
              {ctx.organizations.map((o) => {
                const isCurrent = o.organizationId === ctx.current.organizationId;
                return (
                  <form
                    key={o.organizationId}
                    action={async () => {
                      "use server";
                      (await cookies()).set(CURRENT_ORG_COOKIE, o.organizationId);
                      redirect("/dashboard");
                    }}
                  >
                    <Button
                      type="submit"
                      variant={isCurrent ? "secondary" : "outline"}
                      size="sm"
                      disabled={isCurrent}
                    >
                      <Building2 aria-hidden />
                      {o.organizationName}
                      <span className="text-muted-foreground">· {o.role}</span>
                    </Button>
                  </form>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
