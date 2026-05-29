import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BedDouble, Building2, ChevronRight, FileText, KeyRound, LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { CURRENT_ORG_COOKIE, getCurrentContext } from "@/server/auth/session";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

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
              <LogOut />
              Esci
            </Button>
          </form>
        }
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Ciao, {ctx.user.name ?? ctx.user.email ?? "utente"}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
              <Building2 className="size-4" />
              {ctx.current.organizationName}
              <Badge variant="secondary">{ctx.current.role}</Badge>
            </p>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/credentials"
            className="group focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                    <KeyRound className="size-5" />
                  </span>
                  <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
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
                    <Building2 className="size-5" />
                  </span>
                  <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
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
                    <BedDouble className="size-5" />
                  </span>
                  <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
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
                    <FileText className="size-5" />
                  </span>
                  <ChevronRight className="text-muted-foreground size-5 transition-transform group-hover:translate-x-0.5" />
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
                      <Building2 />
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
