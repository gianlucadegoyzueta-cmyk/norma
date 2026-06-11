import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { TaxDeclarationStatus, TaxRemittanceMode } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { periodLabel } from "@/server/modules/tourist-tax/domain/period";
import { formatEuroCents } from "@/server/modules/tourist-tax/services/estimate.service";
import { SiteHeader } from "@/components/site-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuildDeclarationForm } from "./BuildDeclarationForm";
import { DeclarationActions } from "./DeclarationActions";

export const metadata: Metadata = { title: "Tassa di soggiorno" };
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<TaxDeclarationStatus, { text: string; variant: BadgeProps["variant"] }> =
  {
    DRAFT: { text: "Bozza", variant: "secondary" },
    READY: { text: "Pronta", variant: "warning" },
    SUBMITTED: { text: "Inviata", variant: "warning" },
    PAID: { text: "Pagata", variant: "success" },
    CANCELLED: { text: "Annullata", variant: "outline" },
  };

export default async function TouristTaxPage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const orgId = ctx.current.organizationId;

  const [declarations, comuni] = await Promise.all([
    prisma.touristTaxDeclaration.findMany({
      where: { organizationId: orgId },
      orderBy: [{ period: "desc" }],
      include: { comune: { select: { name: true } } },
    }),
    prisma.comune.findMany({
      where: { properties: { some: { organizationId: orgId } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
          <ArrowLeft className="size-4" aria-hidden />
          Dashboard
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Tassa di soggiorno</h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Preparo le dichiarazioni periodiche per comune: calcolo l&apos;imposta, esporto e tengo
            traccia del versamento.
          </p>
        </div>

        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Nuova dichiarazione</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4 text-sm">
                Aggrego i soggiorni del periodo per un comune e calcolo l&apos;imposta dovuta.
              </p>
              <BuildDeclarationForm comuni={comuni} />
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="declarations-heading">
          <h2 id="declarations-heading" className="text-muted-foreground mb-3 text-sm font-medium">
            Dichiarazioni
          </h2>
          {declarations.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center text-sm">
                Nessuna dichiarazione. Calcola la prima scegliendo comune e periodo qui sopra.
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-3">
              {declarations.map((d) => {
                const badge = STATUS_BADGE[d.status];
                return (
                  <li key={d.id}>
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">
                              {d.comune.name} · {periodLabel(d.period)}
                            </CardTitle>
                            <p className="text-muted-foreground mt-1 text-sm">
                              Imposta dovuta:{" "}
                              <span className="text-foreground font-medium">
                                {formatEuroCents(d.amountCents)}
                              </span>
                            </p>
                          </div>
                          <Badge variant={badge.variant} className="shrink-0">
                            {badge.text}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <DeclarationActions
                          id={d.id}
                          status={d.status}
                          remittanceMode={d.remittanceMode as TaxRemittanceMode}
                        />
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="text-muted-foreground mt-8 text-xs">
          Gli importi sono stime basate sulle regole comunali configurate, valide alla data dei
          soggiorni. Verifica sul regolamento del comune prima del versamento.
        </p>
      </main>
    </div>
  );
}
