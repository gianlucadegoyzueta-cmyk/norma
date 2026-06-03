import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BedDouble, CalendarDays, Users } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaPropertyRepository } from "@/server/modules/properties";
import { PrismaReferenceTablesLoader, PrismaSchedinaRepository } from "@/server/modules/alloggiati";
import { PrismaStaysRepository, StaysService } from "@/server/modules/stays";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StayForm } from "./StayForm";

export const metadata: Metadata = { title: "Soggiorni" };

// Pagina sempre dinamica (legge sessione + DB per utente).
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Rome",
});

export default async function StaysPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.current.organizationId;
  const staysService = new StaysService(
    new PrismaStaysRepository(prisma),
    new PrismaSchedinaRepository(prisma),
    new PrismaReferenceTablesLoader(prisma),
  );

  const [stays, properties] = await Promise.all([
    staysService.listStays(orgId),
    new PrismaPropertyRepository(prisma).listByOrganization(orgId),
  ]);

  const formProperties = properties.map((p) => ({
    id: p.id,
    name: p.name,
    comuneName: p.comune.name,
    provincia: p.comune.provincia,
    hasCredential: p.credential !== null,
  }));

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-4 py-8 outline-none sm:px-6 sm:py-10"
      >
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Soggiorni</h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Registra i soggiorni di{" "}
            <strong className="text-foreground">{ctx.current.organizationName}</strong>. Dopo aver
            aggiunto gli ospiti, dal soggiorno si generano le schedine da inviare ad Alloggiati.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">I tuoi soggiorni</h2>
          {stays.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
                  <BedDouble className="size-5" />
                </span>
                <p className="text-muted-foreground text-sm">
                  Nessun soggiorno ancora. Creane uno qui sotto.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-2">
              {stays.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/stays/${s.id}`}
                    className="group focus-visible:ring-ring block rounded-xl outline-none focus-visible:ring-2"
                  >
                    <Card className="transition-shadow group-hover:shadow-md">
                      <CardContent className="flex items-center justify-between gap-4 px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.propertyName}</p>
                          <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="size-3 shrink-0" />
                              {dateFmt.format(s.arrivalDate)}
                              {s.departureDate ? ` → ${dateFmt.format(s.departureDate)}` : ""}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="size-3 shrink-0" />
                              {s.guestsAdded}/{s.guestsCount} ospiti
                            </span>
                            {s.isShortStay && <span>· breve (≤24h)</span>}
                          </p>
                        </div>
                        {s.schedine.total === 0 ? (
                          <Badge variant="secondary" className="shrink-0">
                            Nessuna schedina
                          </Badge>
                        ) : (
                          <div className="flex shrink-0 flex-wrap justify-end gap-1">
                            {s.schedine.acquired > 0 && (
                              <Badge variant="success">{s.schedine.acquired} acquisite</Badge>
                            )}
                            {s.schedine.pending > 0 && (
                              <Badge variant="secondary">{s.schedine.pending} da inviare</Badge>
                            )}
                            {s.schedine.sending > 0 && (
                              <Badge variant="secondary">{s.schedine.sending} in invio</Badge>
                            )}
                            {s.schedine.rejected > 0 && (
                              <Badge variant="destructive">{s.schedine.rejected} respinte</Badge>
                            )}
                            {s.schedine.unverified > 0 && (
                              <Badge variant="warning">{s.schedine.unverified} da verificare</Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Nuovo soggiorno</CardTitle>
            </CardHeader>
            <CardContent>
              {formProperties.length === 0 ? (
                <div className="text-muted-foreground text-sm">
                  Per creare un soggiorno serve prima un immobile.{" "}
                  <Link href="/properties" className="text-foreground font-medium underline">
                    Aggiungi un immobile
                  </Link>
                  .
                </div>
              ) : (
                <StayForm properties={formProperties} />
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
