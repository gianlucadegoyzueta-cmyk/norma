import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
        <h2 id="stays-heading" className="cmx-section-title">
          I tuoi soggiorni
        </h2>
        <StaysList stays={stays} />
      </section>

      <section className="cmx-section">
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
