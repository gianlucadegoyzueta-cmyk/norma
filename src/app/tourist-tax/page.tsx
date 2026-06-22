import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { TaxDeclarationStatus, TaxRemittanceMode } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { periodLabel } from "@/server/modules/tourist-tax/domain/period";
import { formatTakeRateBps } from "@/server/modules/tourist-tax/domain/take-rate";
import { formatEuroCents } from "@/server/modules/tourist-tax/services/estimate.service";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuildDeclarationForm } from "./BuildDeclarationForm";
import { DeclarationActions } from "./DeclarationActions";

export const metadata: Metadata = { title: "Tassa di soggiorno" };
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<TaxDeclarationStatus, { text: string; cmx: string }> = {
  DRAFT: { text: "Bozza", cmx: "cmx-badge-wait" },
  READY: { text: "Pronta", cmx: "cmx-badge-wait" },
  SUBMITTED: { text: "Inviata", cmx: "cmx-badge-wait" },
  PAID: { text: "Pagata", cmx: "cmx-badge-ok" },
  CANCELLED: { text: "Annullata", cmx: "cmx-badge-wait" },
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
    <ConciergePage
      kicker="VERSAMENTI · IMPOSTA DI SOGGIORNO"
      title="Tassa di soggiorno"
      intro="Preparo le dichiarazioni periodiche per comune: calcolo l'imposta, esporto e tengo traccia del versamento."
    >
      <section className="cmx-section" style={{ marginTop: 0 }}>
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle className="font-display">Nuova dichiarazione</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4 text-sm">
              Aggrego i soggiorni del periodo per un comune e calcolo l&apos;imposta dovuta.
            </p>
            <BuildDeclarationForm comuni={comuni} />
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="declarations-heading" className="cmx-section">
        <h2 id="declarations-heading" className="cmx-section-title">
          Dichiarazioni
        </h2>
        {declarations.length === 0 ? (
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessuna dichiarazione, per ora</p>
            <p className="cmx-empty-text">
              Calcola la prima scegliendo comune e periodo qui sopra.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {declarations.map((d) => {
              const badge = STATUS_BADGE[d.status];
              return (
                <li key={d.id}>
                  <Card style={{ borderRadius: 18 }}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="font-display text-base">
                            {d.comune.name} · {periodLabel(d.period)}
                          </CardTitle>
                          <p className="text-muted-foreground mt-1 text-sm">
                            Imposta riscossa:{" "}
                            <span className="font-medium" style={{ color: "var(--inchiostro)" }}>
                              {formatEuroCents(d.amountCents)}
                            </span>
                          </p>
                        </div>
                        <span className={`cmx-badge ${badge.cmx} shrink-0`}>{badge.text}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {d.normaTakeRateBps > 0 && (
                        <dl
                          className="mb-4 grid gap-2 rounded-xl p-3 text-sm"
                          style={{
                            background: "var(--avorio, #f7f2e8)",
                            border: "1px solid var(--hairline, #d4cabb)",
                          }}
                        >
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-muted-foreground">Imposta lorda riscossa</dt>
                            <dd className="font-medium">{formatEuroCents(d.amountCents)}</dd>
                          </div>
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="text-muted-foreground">
                              Servizio Norma ({formatTakeRateBps(d.normaTakeRateBps)})
                            </dt>
                            <dd
                              className="font-medium"
                              style={{ color: "var(--terracotta, #bc4b2b)" }}
                            >
                              − {formatEuroCents(d.normaFeeCents)}
                            </dd>
                          </div>
                          <div
                            className="flex items-baseline justify-between gap-3 border-t pt-2"
                            style={{ borderColor: "var(--hairline, #d4cabb)" }}
                          >
                            <dt className="font-medium" style={{ color: "var(--inchiostro)" }}>
                              Netto da versare al comune
                            </dt>
                            <dd
                              className="font-display text-base font-medium"
                              style={{ color: "var(--inchiostro)" }}
                            >
                              {formatEuroCents(d.comuneNetCents)}
                            </dd>
                          </div>
                        </dl>
                      )}
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
    </ConciergePage>
  );
}
