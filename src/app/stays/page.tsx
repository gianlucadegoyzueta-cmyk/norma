import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CalendarDays, CalendarX2, Download, Users } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaPropertyRepository } from "@/server/modules/properties";
import { PrismaReferenceTablesLoader, PrismaSchedinaRepository } from "@/server/modules/alloggiati";
import {
  deriveImportProvenance,
  type ImportNotice,
  PrismaStaysRepository,
  StaysService,
} from "@/server/modules/stays";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NO_SCHEDINA_LABEL } from "@/lib/schedina-status-display";
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

/** Badge di "richiamo" per i soggiorni importati che richiedono attenzione (annulli/da completare). */
function ImportNoticeBadge({ notice }: { notice: ImportNotice }) {
  if (notice.kind === "cancelled") {
    return (
      <span className="cmx-badge cmx-badge-err inline-flex items-center gap-1">
        <CalendarX2 className="size-3 shrink-0" aria-hidden />
        Annullata dal calendario
      </span>
    );
  }
  if (notice.kind === "needs-cancel-review") {
    return (
      <span className="cmx-badge cmx-badge-err inline-flex items-center gap-1">
        <AlertTriangle className="size-3 shrink-0" aria-hidden />
        Verifica annullamento
      </span>
    );
  }
  // draft-empty: bozza importata senza ospiti, da completare.
  return (
    <span className="cmx-badge cmx-badge-wait inline-flex items-center gap-1">
      <Download className="size-3 shrink-0" aria-hidden />
      Ospiti da inserire
    </span>
  );
}

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
    <ConciergePage
      kicker="REGISTRO · SOGGIORNI"
      title="Soggiorni"
      intro={
        <>
          I soggiorni di{" "}
          <strong style={{ color: "var(--inchiostro)" }}>{ctx.current.organizationName}</strong>.
          Quando hai aggiunto gli ospiti, genero le schedine da inviare ad Alloggiati.
        </>
      }
    >
      <section aria-labelledby="stays-heading" className="cmx-section" style={{ marginTop: 0 }}>
        <h2 id="stays-heading" className="cmx-section-title">
          I tuoi soggiorni
        </h2>
        {stays.length === 0 ? (
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessun soggiorno, per ora</p>
            <p className="cmx-empty-text">
              Creane uno qui sotto: scegli l&apos;immobile e le date, poi aggiungi gli ospiti.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {stays.map((s) => {
              const provenance = deriveImportProvenance({
                importSource: s.importSource,
                importStatus: s.importStatus,
                guestsAdded: s.guestsAdded,
              });
              return (
                <li key={s.id}>
                  <Link
                    href={`/stays/${s.id}`}
                    className="focus-visible:ring-ring block rounded-2xl outline-none focus-visible:ring-2"
                  >
                    <div className="cmx-row">
                      <div className="cmx-row-main">
                        <p className="cmx-row-title truncate">{s.propertyName}</p>
                        <p className="cmx-row-meta flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="size-3 shrink-0" aria-hidden />
                            {dateFmt.format(s.arrivalDate)}
                            {s.departureDate ? ` → ${dateFmt.format(s.departureDate)}` : ""}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users className="size-3 shrink-0" aria-hidden />
                            {s.guestsAdded}/{s.guestsCount} ospiti
                          </span>
                          {provenance.sourceLabel && (
                            <span className="inline-flex items-center gap-1">
                              <Download className="size-3 shrink-0" aria-hidden />
                              {provenance.sourceLabel}
                            </span>
                          )}
                          {s.isShortStay && <span>· breve (≤24h)</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {provenance.notice && <ImportNoticeBadge notice={provenance.notice} />}
                        {s.schedine.total === 0 ? (
                          <span className="cmx-badge cmx-badge-wait">{NO_SCHEDINA_LABEL}</span>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {s.schedine.acquired > 0 && (
                              <span className="cmx-badge cmx-badge-ok">
                                {s.schedine.acquired} acquisite
                              </span>
                            )}
                            {s.schedine.pending > 0 && (
                              <span className="cmx-badge cmx-badge-wait">
                                {s.schedine.pending} da inviare
                              </span>
                            )}
                            {s.schedine.sending > 0 && (
                              <span className="cmx-badge cmx-badge-wait">
                                {s.schedine.sending} in invio
                              </span>
                            )}
                            {s.schedine.rejected > 0 && (
                              <span className="cmx-badge cmx-badge-err">
                                {s.schedine.rejected} respinte
                              </span>
                            )}
                            {s.schedine.unverified > 0 && (
                              <span className="cmx-badge cmx-badge-wait">
                                {s.schedine.unverified} da verificare
                              </span>
                            )}
                          </div>
                        )}
                        {s.schedine.needsReview > 0 && (
                          <span className="cmx-badge cmx-badge-err">
                            {s.schedine.needsReview} da rivedere
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="cmx-section">
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle className="font-display">Nuovo soggiorno</CardTitle>
          </CardHeader>
          <CardContent>
            {formProperties.length === 0 ? (
              <div className="text-muted-foreground text-sm">
                Per creare un soggiorno serve prima un immobile.{" "}
                <Link href="/properties" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
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
    </ConciergePage>
  );
}
