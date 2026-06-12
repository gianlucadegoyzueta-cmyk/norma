import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, CalendarPlus, MapPin } from "lucide-react";
import type { StayImportStatus } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaReservationImportRepository, sourceLabel } from "@/server/modules/reservations";
import { SiteHeader } from "@/components/site-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ICalImportRow, type ICalImportRowData } from "./ICalImportRow";
import { ICalWizard } from "./ICalWizard";

export const metadata: Metadata = { title: "Immobile" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Rome",
});
const dateTimeFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

const IMPORT_BADGE: Record<StayImportStatus, { text: string; variant: BadgeProps["variant"] }> = {
  DRAFT: { text: "Bozza", variant: "secondary" },
  CANCELLED: { text: "Annullata", variant: "destructive" },
  NEEDS_CANCEL_REVIEW: { text: "Verifica annullamento", variant: "warning" },
};

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const orgId = ctx.current.organizationId;

  const property = await prisma.property.findFirst({
    where: { id, organizationId: orgId },
    select: {
      id: true,
      name: true,
      address: true,
      comune: { select: { name: true, provincia: true } },
    },
  });
  if (!property) notFound();

  const repo = new PrismaReservationImportRepository(prisma);
  const [imports, importedStays] = await Promise.all([
    repo.listByProperty(property.id, orgId),
    repo.listImportedStaysForProperty(property.id, orgId),
  ]);

  const importRows: ICalImportRowData[] = imports.map((imp) => ({
    id: imp.id,
    sourceLabel: sourceLabel(imp.source),
    url: imp.url,
    lastSync: !imp.lastSyncAt
      ? { kind: "never" }
      : imp.lastError
        ? { kind: "error", message: imp.lastError }
        : { kind: "ok", when: dateTimeFmt.format(imp.lastSyncAt), count: imp.lastImported },
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
          href="/properties"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Immobili
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">{property.name}</h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm">
            <MapPin className="size-4 shrink-0" />
            {property.address} · {property.comune.name} ({property.comune.provincia})
          </p>
        </div>

        <section className="mb-10">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">
            Calendari delle prenotazioni (iCal)
          </h2>
          <Card>
            <CardContent className="grid gap-4 py-5">
              <p className="text-muted-foreground max-w-prose text-sm">
                Collega il calendario iCal di Airbnb, Booking.com o VRBO: incolla il link e Norma ti
                mostra le prenotazioni trovate prima di importarle. Crea i soggiorni in bozza,
                pronti da completare con gli ospiti. Aggiorni quando vuoi con «Sincronizza ora».
              </p>

              {importRows.length > 0 && (
                <div className="grid gap-2">
                  {importRows.map((row) => (
                    <ICalImportRow key={row.id} propertyId={property.id} data={row} />
                  ))}
                </div>
              )}

              <div className="border-border/60 border-t pt-4">
                <ICalWizard propertyId={property.id} />
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">Prenotazioni importate</h2>
          {importedStays.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
                  <CalendarPlus className="size-5" />
                </span>
                <p className="text-muted-foreground text-sm">
                  Nessuna prenotazione importata. Collega un calendario e premi «Sincronizza ora».
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-2">
              {importedStays.map((s) => {
                const badge = s.importStatus ? IMPORT_BADGE[s.importStatus] : null;
                return (
                  <li key={s.id}>
                    <Card>
                      <CardContent className="px-4 py-3">
                        <Link
                          href={`/stays/${s.id}`}
                          className="flex items-start justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <p className="flex items-center gap-1.5 font-medium">
                              <CalendarClock className="text-muted-foreground size-4 shrink-0" />
                              {dateFmt.format(s.arrivalDate)}
                              {s.departureDate ? ` → ${dateFmt.format(s.departureDate)}` : ""}
                            </p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {s.importSource ? sourceLabel(s.importSource) : "iCal"} ·{" "}
                              {s.guestsAdded > 0
                                ? `${s.guestsAdded} ospiti inseriti`
                                : "ospiti da inserire"}
                            </p>
                          </div>
                          {badge && (
                            <Badge variant={badge.variant} className="shrink-0">
                              {badge.text}
                            </Badge>
                          )}
                        </Link>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
