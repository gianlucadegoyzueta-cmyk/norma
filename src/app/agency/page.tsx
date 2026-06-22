import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { hasRole } from "@/server/auth/access";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import type {
  AgencyTotals,
  PropertyComplianceRow,
} from "@/server/modules/dashboard/agency-overview";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { getAgencyOverview } from "./_lib/data";
import { PropertySwitcher } from "./PropertySwitcher";
import "./agency.css";

export const metadata: Metadata = { title: "Agenzia" };

export const dynamic = "force-dynamic";

function euros(cents: number): string {
  return new Intl.NumberFormat("it-IT", { minimumFractionDigits: 0 }).format(
    Math.round(cents / 100),
  );
}

/** Totali ricalcolati su un sottoinsieme di righe (per il filtro su singola struttura). */
function totalsOf(rows: readonly PropertyComplianceRow[]): AgencyTotals {
  return {
    propertyCount: rows.length,
    propertiesWithoutCredential: rows.filter((r) => !r.hasCredential).length,
    propertiesWithoutCin: rows.filter((r) => !r.hasCin).length,
    schedineOverdue: rows.reduce((a, r) => a + r.schedineOverdue, 0),
    schedinePending: rows.reduce((a, r) => a + r.schedinePending, 0),
    checkinsToday: rows.reduce((a, r) => a + r.checkinsToday, 0),
    taxAccruedCents: rows.reduce((a, r) => a + r.taxAccruedCents, 0),
    istatReadyCount: rows.filter((r) => r.istatReadiness === "ready").length,
    istatIncompleteCount: rows.filter((r) => r.istatReadiness === "incomplete").length,
    propertiesNeedingAttention: rows.filter((r) => r.needsAttention).length,
  };
}

export default async function AgencyPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const { property: requestedProperty } = await searchParams;
  const orgId = ctx.current.organizationId;
  const overview = await getAgencyOverview(prisma, orgId);

  // Isolamento: il filtro vale solo se la proprietà richiesta è dell'org (altrimenti "Tutte").
  const selectedId =
    requestedProperty && overview.rows.some((r) => r.propertyId === requestedProperty)
      ? requestedProperty
      : null;

  const visibleRows = selectedId
    ? overview.rows.filter((r) => r.propertyId === selectedId)
    : overview.rows;
  const totals = selectedId ? totalsOf(visibleRows) : overview.totals;

  // Gating di presentazione minimale: l'enfasi "agenzia" è per chi guida l'account (OWNER/ADMIN);
  // i collaboratori (MEMBER) vedono la stessa overview con un'intestazione più sobria.
  const isAgencyLead = hasRole(ctx.current.role, ["OWNER", "ADMIN"]);

  const switcherOptions = overview.rows.map((r) => ({ id: r.propertyId, name: r.propertyName }));

  return (
    <ConciergePage
      kicker={isAgencyLead ? "REGIA · AGENZIA" : "PANORAMICA · STRUTTURE"}
      title={
        <>
          Le tue <em>strutture</em>
        </>
      }
      intro={
        <>
          La regia di{" "}
          <strong style={{ color: "var(--inchiostro)" }}>{ctx.current.organizationName}</strong>:
          tutta la compliance dei tuoi immobili in un colpo d&apos;occhio. Schedine da inviare,
          check-in di oggi, tassa di soggiorno e prontezza ISTAT — per ogni struttura.
        </>
      }
    >
      {overview.rows.length === 0 ? (
        <section className="cmx-section" style={{ marginTop: 24 }}>
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessuna struttura, per ora</p>
            <p className="cmx-empty-text">
              Aggiungi i tuoi immobili e qui vedrai la panoramica di compliance di tutta l&apos;
              agenzia, struttura per struttura.{" "}
              <Link href="/properties" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                Aggiungi un immobile
              </Link>
              .
            </p>
          </div>
        </section>
      ) : (
        <>
          {switcherOptions.length > 1 && (
            <PropertySwitcher options={switcherOptions} selectedId={selectedId} />
          )}

          <section
            aria-labelledby="agency-totals-heading"
            className="cmx-section"
            style={{ marginTop: 28 }}
          >
            <h2 id="agency-totals-heading" className="cmx-section-title">
              {selectedId ? visibleRows[0].propertyName : "Tutte le strutture"}
            </h2>
            <div className="agency-kpis">
              <article className="agency-kpi">
                <div
                  className="agency-kpi-value"
                  data-tone={totals.schedineOverdue > 0 ? "alert" : undefined}
                >
                  {totals.schedineOverdue}
                </div>
                <div className="agency-kpi-label">Schedine oltre scadenza</div>
                <div className="agency-kpi-hint">
                  {totals.schedinePending} in attesa di conferma
                </div>
              </article>
              <article className="agency-kpi">
                <div
                  className="agency-kpi-value"
                  data-tone={totals.checkinsToday > 0 ? "alert" : undefined}
                >
                  {totals.checkinsToday}
                </div>
                <div className="agency-kpi-label">Check-in attesi oggi</div>
                <div className="agency-kpi-hint">arrivi senza check-in completato</div>
              </article>
              <article className="agency-kpi">
                <div className="agency-kpi-value">€{euros(totals.taxAccruedCents)}</div>
                <div className="agency-kpi-label">Tassa di soggiorno (periodo)</div>
                <div className="agency-kpi-hint">
                  maturata nel periodo di dichiarazione di ogni comune
                </div>
              </article>
              <article className="agency-kpi">
                <div className="agency-kpi-value">
                  {totals.istatReadyCount}/{totals.propertyCount}
                </div>
                <div className="agency-kpi-label">Pronte per ISTAT</div>
                <div className="agency-kpi-hint">
                  {totals.istatIncompleteCount > 0
                    ? `${totals.istatIncompleteCount} da configurare`
                    : "tutte configurate"}
                </div>
              </article>
            </div>
          </section>

          <section aria-labelledby="agency-rows-heading" className="cmx-section">
            <h2 id="agency-rows-heading" className="cmx-section-title">
              Dettaglio per struttura
            </h2>
            <ul className="grid gap-0">
              {visibleRows.map((r) => (
                <li key={r.propertyId}>
                  <div
                    className="agency-row"
                    data-attention={r.needsAttention ? "true" : undefined}
                  >
                    <Link href={`/properties/${r.propertyId}`} className="agency-row-link">
                      <span
                        className="agency-dot"
                        data-attention={r.needsAttention ? "true" : undefined}
                        aria-hidden
                      />
                      <span className="agency-row-main">
                        <span className="agency-row-title">{r.propertyName}</span>
                        <span className="agency-row-meta">
                          {r.comuneName} ({r.provincia}) · {r.proprietario}
                        </span>
                      </span>
                    </Link>
                    <div className="agency-row-badges">
                      {r.schedineOverdue > 0 && (
                        <span className="cmx-badge cmx-badge-err">
                          {r.schedineOverdue} oltre scadenza
                        </span>
                      )}
                      {r.schedinePending > 0 && (
                        <span className="cmx-badge cmx-badge-wait">
                          {r.schedinePending} da confermare
                        </span>
                      )}
                      {r.checkinsToday > 0 && (
                        <span className="cmx-badge cmx-badge-go">
                          {r.checkinsToday} check-in oggi
                        </span>
                      )}
                      {!r.hasCredential && (
                        <span className="cmx-badge cmx-badge-err">Senza credenziale</span>
                      )}
                      {!r.hasCin && <span className="cmx-badge cmx-badge-err">Senza CIN</span>}
                      <span
                        className={`cmx-badge ${
                          r.istatReadiness === "ready" ? "cmx-badge-ok" : "cmx-badge-wait"
                        }`}
                      >
                        {r.istatReadiness === "ready" ? "ISTAT pronta" : "ISTAT da configurare"}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </ConciergePage>
  );
}
