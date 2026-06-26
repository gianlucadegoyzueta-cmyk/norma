import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { ConciergeCompliance } from "@/components/dashboard/concierge-compliance";
import { ConciergeProperties } from "@/components/dashboard/concierge-properties";
import { InfoHint } from "@/components/ui/info-hint";
import { getDashboardData } from "@/app/dashboard/_lib/data";
import { getDashboardPanels } from "@/app/dashboard/_lib/panels";

export const metadata: Metadata = { title: "Statistiche" };

// Pagina SECONDARIA (PARTE 6/FASE 3): metriche di ricettività (occupazione, ospiti, ore
// risparmiate) + posizione compliance. Qui vivono le metriche "vanity" tolte dalla dashboard
// prodotto-first: la home parla di adempimento, le statistiche di andamento. Solo letture
// aggregate già esistenti (riusa getDashboardData/Panels): zero schema, zero dominio nuovo.

function StatCard({
  label,
  value,
  sub,
  hint,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  hint?: ReactNode;
}) {
  return (
    <div className="bg-card rounded-xl border border-[var(--brand-hairline)] p-4">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-[0.06em] uppercase">
        {label}
        {hint}
      </div>
      <div className="text-foreground mt-1.5 text-[26px] leading-none font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {sub && <div className="text-muted-foreground mt-1.5 text-[12.5px]">{sub}</div>}
    </div>
  );
}

export default async function StatistichePage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.current.organizationId;
  const now = new Date();
  const [data, panels] = await Promise.all([
    getDashboardData(prisma, orgId, now),
    getDashboardPanels(prisma, orgId, now),
  ]);

  const k = data.kpis;
  const monthName = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    timeZone: "Europe/Rome",
  }).format(now);

  return (
    <ConciergePage
      active="statistiche"
      dense
      kicker="PANORAMICA"
      title="Statistiche"
      intro={`Andamento di ${monthName}: ricettività e posizione di compliance. I numeri qui sono indicativi — gli adempimenti restano sulla dashboard e nei due strumenti.`}
    >
      {/* Ricettività */}
      <section aria-labelledby="stat-ricettivita">
        <h2
          id="stat-ricettivita"
          className="text-foreground mb-3 text-[13px] font-semibold tracking-[0.04em] uppercase"
        >
          Ricettività · {monthName}
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Occupazione"
            value={`${k.occupancyPct}%`}
            sub={`${k.occupiedNights}/${k.capacityNights} notti`}
          />
          <StatCard label="Ospiti registrati" value={k.guestsThisMonth} sub="nel mese" />
          <StatCard
            label="Strutture"
            value={k.propertyCount}
            sub={k.propertyCount === 1 ? "attiva" : "attive"}
          />
          <StatCard
            label="Ore risparmiate"
            value={`~${k.hoursSaved}`}
            sub={`stima · ${k.guestsThisMonth} ospiti`}
            hint={
              <InfoHint
                label="Come si calcola la stima delle ore risparmiate"
                title="Stima indicativa"
              >
                Circa 15 minuti di pratiche per ospite che Norma prepara per te (schedine, conteggi,
                tracciati). È un&apos;indicazione, non un dato contabile.
              </InfoHint>
            }
          />
          <StatCard
            label="Tassa maturata"
            value={`€${k.taxAccruedEuros}`}
            sub="trimestre in corso"
          />
        </div>
      </section>

      {/* Compliance */}
      <section className="mt-8" aria-labelledby="stat-compliance">
        <h2
          id="stat-compliance"
          className="text-foreground mb-3 text-[13px] font-semibold tracking-[0.04em] uppercase"
        >
          Posizione di compliance
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard
            label="Schedine in coda"
            value={data.pendingSchedine}
            sub={
              data.overdueSchedine > 0
                ? `${data.overdueSchedine} oltre scadenza`
                : "nessuna scaduta"
            }
          />
          <StatCard
            label="ISTAT pronte"
            value={`${data.istat.ready}/${data.istat.total}`}
            sub={`movimento · ${data.istat.monthLabel}`}
          />
          <StatCard
            label="ISTAT da completare"
            value={data.istat.incomplete}
            sub="dati mancanti segnalati"
            hint={
              <InfoHint
                label="Cosa fare per le strutture ISTAT da completare"
                title="Cosa fare ora"
                align="right"
              >
                A queste strutture manca un dato (struttura o ospite) per generare il tracciato. Su{" "}
                <b>Movimento ISTAT</b> Norma ti dice esattamente cosa manca e dove inserirlo — non
                inventa mai.
              </InfoHint>
            }
          />
          <StatCard
            label="Acquisite di recente"
            value={data.acquiredYesterday}
            sub="ricevuta Questura verificata"
          />
        </div>
        <div className="mt-5">
          <ConciergeCompliance
            months={panels.compliance.months}
            summary={panels.compliance.summary}
          />
        </div>
      </section>

      {/* Per struttura */}
      {panels.properties.length > 0 && (
        <section className="mt-8" aria-labelledby="stat-strutture">
          <h2
            id="stat-strutture"
            className="text-foreground mb-3 text-[13px] font-semibold tracking-[0.04em] uppercase"
          >
            Per struttura
          </h2>
          <ConciergeProperties items={panels.properties} />
        </section>
      )}
    </ConciergePage>
  );
}
