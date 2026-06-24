import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, MapPin } from "lucide-react";
import type { StayImportStatus } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaReservationImportRepository, sourceLabel } from "@/server/modules/reservations";
import { ConciergePage } from "@/components/concierge/concierge-page";
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

const IMPORT_BADGE: Record<StayImportStatus, { text: string; cmx: string }> = {
  DRAFT: { text: "Bozza", cmx: "cmx-badge-wait" },
  CANCELLED: { text: "Annullata", cmx: "cmx-badge-err" },
  NEEDS_CANCEL_REVIEW: { text: "Verifica annullamento", cmx: "cmx-badge-wait" },
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

  // Riepilogo di stato delle prenotazioni importate, dai dati già caricati (nessuna query in più).
  // Stessi colori/etichette dei badge della lista: l'intestazione "rima" con le righe sotto.
  const statusCounts = (Object.keys(IMPORT_BADGE) as StayImportStatus[])
    .map((status) => ({
      status,
      ...IMPORT_BADGE[status],
      count: importedStays.filter((s) => s.importStatus === status).length,
    }))
    .filter((s) => s.count > 0);

  return (
    <ConciergePage
      dense
      active="properties"
      backHref="/properties"
      backLabel="Immobili"
      kicker="DETTAGLIO · IMMOBILE"
      title={property.name}
      intro={
        <span className="flex items-center gap-1.5">
          <MapPin className="size-4 shrink-0" />
          {property.address} · {property.comune.name} ({property.comune.provincia})
        </span>
      }
    >
      <section className="cmx-section" style={{ marginTop: 0 }}>
        <h2 className="cmx-section-title">Calendari delle prenotazioni (iCal)</h2>
        <Card style={{ borderRadius: 18 }}>
          <CardContent className="grid gap-4 py-5">
            <p className="text-muted-foreground max-w-prose text-sm">
              Collega il calendario iCal di Airbnb, Booking.com o VRBO: incolla il link e Norma ti
              mostra le prenotazioni trovate prima di importarle. Crea i soggiorni in bozza, pronti
              da completare con gli ospiti. Aggiorni quando vuoi con «Sincronizza ora».
            </p>

            {importRows.length > 0 ? (
              <div className="grid gap-2">
                {importRows.map((row) => (
                  <ICalImportRow key={row.id} propertyId={property.id} data={row} />
                ))}
              </div>
            ) : (
              <p
                className="border-border/60 text-muted-foreground rounded-lg border border-dashed px-4 py-3 text-sm"
                style={{ background: "rgba(251, 249, 243, 0.5)" }}
              >
                Nessun calendario collegato · collega il primo qui sotto.
              </p>
            )}

            <div className="border-border/60 border-t pt-4">
              <ICalWizard propertyId={property.id} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="cmx-section" style={{ marginTop: 32 }}>
        <h2 className="cmx-section-title">Prenotazioni importate</h2>
        {importedStays.length === 0 ? (
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessuna prenotazione importata</p>
            <p className="cmx-empty-text">
              Collega un calendario qui sopra e premi «Sincronizza ora».
            </p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm font-medium">
                Totale <span className="tabular-nums">{importedStays.length}</span>{" "}
                {importedStays.length === 1 ? "prenotazione" : "prenotazioni"}
              </span>
              {statusCounts.map((s) => (
                <span key={s.status} className={`cmx-badge ${s.cmx}`}>
                  {s.count} {s.text.toLowerCase()}
                </span>
              ))}
            </div>
            <ul className="grid gap-2.5">
              {importedStays.map((s) => {
                const badge = s.importStatus ? IMPORT_BADGE[s.importStatus] : null;
                return (
                  <li key={s.id}>
                    <Link href={`/stays/${s.id}`} className="block">
                      <div className="cmx-row">
                        <div className="cmx-row-main">
                          <p className="cmx-row-title flex items-center gap-1.5">
                            <CalendarClock
                              className="size-4 shrink-0"
                              style={{ color: "var(--soft)" }}
                            />
                            {dateFmt.format(s.arrivalDate)}
                            {s.departureDate ? ` → ${dateFmt.format(s.departureDate)}` : ""}
                          </p>
                          <p className="cmx-row-meta">
                            {s.importSource ? sourceLabel(s.importSource) : "iCal"} ·{" "}
                            {s.guestsAdded > 0
                              ? `${s.guestsAdded} ospiti inseriti`
                              : "ospiti da inserire"}
                          </p>
                        </div>
                        {badge && (
                          <span className={`cmx-badge ${badge.cmx} shrink-0`}>{badge.text}</span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </ConciergePage>
  );
}
