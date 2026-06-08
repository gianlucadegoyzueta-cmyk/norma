import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BedDouble,
  Building2,
  ChevronRight,
  FileText,
  KeyRound,
  LogOut,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import type { SchedinaStatus } from "@prisma/client";
import { signOut } from "@/auth";
import { CURRENT_ORG_COOKIE, getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { CinService, PrismaCinRepository } from "@/server/modules/cin";
import { getOnboardingState } from "@/server/modules/onboarding/state";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SealMark } from "@/components/ui/seal-mark";
import { SectionHeading } from "@/components/ui/section-heading";
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

  // Metriche "a colpo d'occhio" (solo letture aggregate, nessun cambio di schema/dominio).
  const orgId = ctx.current.organizationId;
  const [propertyCount, stayCount, schedinaByStatus, taxToSubmit] = await Promise.all([
    prisma.property.count({ where: { organizationId: orgId } }),
    prisma.stay.count({ where: { organizationId: orgId } }),
    prisma.schedina.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { _all: true },
    }),
    prisma.touristTaxDeclaration.count({
      where: { organizationId: orgId, status: { in: ["DRAFT", "READY"] } },
    }),
  ]);
  const schedinaCountBy = (s: SchedinaStatus) =>
    schedinaByStatus.find((r) => r.status === s)?._count._all ?? 0;
  // "Da gestire" = tutte le non-acquisite che richiedono azione (in coda o da correggere).
  const schedineToHandle =
    schedinaCountBy("PENDING") +
    schedinaCountBy("SENDING") +
    schedinaCountBy("UNVERIFIED") +
    schedinaCountBy("REJECTED");
  const schedineAcquired = schedinaCountBy("ACQUIRED");

  const overview = [
    {
      label: "Schedine da gestire",
      value: schedineToHandle,
      sub: `${schedineAcquired} inviate`,
      href: "/schedine",
      Icon: FileText,
    },
    {
      label: "Immobili",
      value: propertyCount,
      sub: cinCompliance.count > 0 ? `${cinCompliance.count} senza CIN` : "registrati",
      href: "/properties",
      Icon: Building2,
    },
    {
      label: "Soggiorni",
      value: stayCount,
      sub: "registrati",
      href: "/stays",
      Icon: BedDouble,
    },
    {
      label: "Tassa di soggiorno",
      value: taxToSubmit,
      sub: "da inviare",
      href: "/tourist-tax",
      Icon: Receipt,
    },
  ];

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  // Tocco editoriale: il cruscotto "sa" il giorno. Data in italiano, iniziale maiuscola.
  const todayLabel = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const todayCap = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

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
        <header className="mb-8">
          <p className="text-primary text-xs font-semibold tracking-[0.14em] uppercase">
            {todayCap}
          </p>
          <h1 className="font-display mt-1.5 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Ciao, {ctx.user.name ?? ctx.user.email ?? "utente"}
          </h1>
          <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="size-4" aria-hidden />
              {ctx.current.organizationName}
            </span>
            <Badge variant="secondary">{ctx.current.role}</Badge>
          </p>
        </header>

        {/* Stato emotivo del cruscotto: quando non c'è nulla di urgente, RASSICURA esplicitamente. */}
        {overdueCount === 0 && onboarding.ready && cinCompliance.count === 0 && (
          <Card variant="success" className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <SealMark className="text-success size-9 shrink-0" />
                <div className="min-w-0">
                  <CardTitle className="text-base">Tutto in regola</CardTitle>
                  <CardDescription className="mt-1">
                    Nessuna scadenza urgente.{" "}
                    {schedineToHandle > 0
                      ? `Hai ${schedineToHandle} ${schedineToHandle === 1 ? "schedina" : "schedine"} in coda, nessuna oltre i termini.`
                      : "Sei in pari con gli adempimenti."}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {overdueCount > 0 && (
          <Link
            href="/schedine"
            className="group focus-visible:ring-ring mb-6 block rounded-xl outline-none focus-visible:ring-2"
          >
            <Card className="border-destructive/40 bg-destructive/5 hover:shadow-card-hover transition-shadow">
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
                        Conviene gestirle ora: la comunicazione ad Alloggiati va fatta entro 24h
                        dall&apos;arrivo. Si possono ancora inviare — apri per procedere.
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
            <Card className="border-primary/40 bg-primary/3 hover:shadow-card-hover transition-shadow">
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
            <Card className="border-warning/50 bg-warning/5 hover:shadow-card-hover transition-shadow">
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

        <section className="mb-8">
          <SectionHeading>A colpo d&apos;occhio</SectionHeading>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {overview.map(({ label, value, sub, href, Icon }) => (
              <Link
                key={label}
                href={href}
                className="group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
              >
                <Card className="group-hover:shadow-card-hover h-full p-4 transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium">{label}</span>
                    <span className="bg-secondary text-accent-foreground flex size-7 items-center justify-center rounded-lg">
                      <Icon className="size-4 shrink-0" aria-hidden />
                    </span>
                  </div>
                  <p className="font-display mt-3 text-3xl font-semibold tracking-tight">{value}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">{sub}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/credentials"
            className="group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
          >
            <Card className="group-hover:shadow-card-hover h-full transition-shadow">
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
            <Card className="group-hover:shadow-card-hover h-full transition-shadow">
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
            <Card className="group-hover:shadow-card-hover h-full transition-shadow">
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
            <Card className="group-hover:shadow-card-hover h-full transition-shadow">
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

          <Link
            href="/istat"
            className="group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
          >
            <Card className="group-hover:shadow-card-hover h-full transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <BarChart3 className="size-5" aria-hidden />
                  </span>
                  <ChevronRight
                    aria-hidden
                    className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5"
                  />
                </div>
                <CardTitle className="mt-2">ISTAT</CardTitle>
                <CardDescription>
                  Movimento turistico del mese: arrivi e presenze per provenienza, con export.
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
