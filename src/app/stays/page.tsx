import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaPropertyRepository } from "@/server/modules/properties";
import { PrismaReferenceTablesLoader, PrismaSchedinaRepository } from "@/server/modules/alloggiati";
import { PrismaStaysRepository, StaysService } from "@/server/modules/stays";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StayForm } from "./StayForm";
import { StaysList } from "./stays-list";

export const metadata: Metadata = { title: "Soggiorni" };

// Pagina sempre dinamica (legge sessione + DB per utente).
export const dynamic = "force-dynamic";

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

  // Riepilogo derivato dai dati GIÀ caricati (nessuna query in più): soggiorni totali, quelli
  // con ospiti ancora da inserire e quelli con schedine in attesa d'invio. Mai inventato:
  // un chip "azione" appare solo quando il suo conteggio è > 0, così la barra resta sobria.
  const total = stays.length;
  const toComplete = stays.filter((s) => s.guestsAdded < s.guestsCount).length;
  const toSend = stays.filter((s) => s.schedine.pending > 0).length;

  return (
    <ConciergePage
      dense
      active="stays"
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="stays-heading" className="cmx-section-title" style={{ margin: 0 }}>
            I tuoi soggiorni
            {total > 0 && (
              <span className="text-muted-foreground ml-2 text-base font-normal">
                · {total} {total === 1 ? "soggiorno" : "soggiorni"}
              </span>
            )}
          </h2>
          {formProperties.length > 0 && (
            <a
              href="#nuovo-soggiorno"
              className="cmx-badge cmx-badge-go inline-flex items-center gap-1.5"
            >
              <Plus className="size-3.5" aria-hidden />
              Aggiungi soggiorno
            </a>
          )}
        </div>

        {/* Barra riepilogo: chip statistici densi sopra la lista. Solo dati già a disposizione.
            Mostra ciò che richiede un'azione (ospiti da inserire, schedine da inviare); se è
            tutto a posto lo dice con un badge, così la riga non resta mai vuota né rumorosa. */}
        {total > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            {toComplete > 0 && (
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-foreground text-lg font-semibold tabular-nums">
                  {toComplete}
                </span>
                <span className="text-muted-foreground text-xs">da completare</span>
              </span>
            )}
            {toSend > 0 && (
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-foreground text-lg font-semibold tabular-nums">{toSend}</span>
                <span className="text-muted-foreground text-xs">con schedine da inviare</span>
              </span>
            )}
            {toComplete === 0 && toSend === 0 && (
              <span className="cmx-badge cmx-badge-ok">Tutto in regola</span>
            )}
          </div>
        )}

        {stays.length === 0 ? (
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessun soggiorno ancora</p>
            <p className="cmx-empty-text">
              {formProperties.length === 0 ? (
                <>
                  Per iniziare aggiungi prima un{" "}
                  <Link href="/properties" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                    immobile
                  </Link>
                  , poi crea il primo soggiorno.
                </>
              ) : (
                <>
                  Crea il primo qui sotto:{" "}
                  <a
                    href="#nuovo-soggiorno"
                    style={{ color: "var(--terracotta)", fontWeight: 600 }}
                  >
                    aggiungi un soggiorno
                  </a>
                  , scegli l&apos;immobile e le date, poi aggiungi gli ospiti.
                </>
              )}
            </p>
          </div>
        ) : (
          <StaysList stays={stays} />
        )}
      </section>

      <section id="nuovo-soggiorno" className="cmx-section" style={{ marginTop: 24 }}>
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle>Nuovo soggiorno</CardTitle>
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
