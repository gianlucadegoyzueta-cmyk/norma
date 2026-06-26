import Link from "next/link";
import { ArrowRight, BarChart3, Building2, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyStatus } from "@/components/dashboard/concierge-properties";

// Home "prodotto-first" (PARTE 6/FASE 2): i DUE pilastri come strumenti grandi e centrali, non
// annegati tra KPI e pannelli. Presentazionale: riceve numeri già calcolati dai dati di dashboard
// (nessuna query nuova). Tono EDITORIAL: mandato + coda invio — nessun claim "in regola".

export interface ConciergeToolsData {
  alloggiati: { pending: number; overdue: number };
  turismo: { istatReady: number; istatTotal: number; taxEuros: number; monthLabel: string };
}

/** Un riquadro-strumento grande: pilastro, stato sintetico, dettaglio, CTA. */
function ToolCard({
  icon,
  pillar,
  subtitle,
  stat,
  statLabel,
  due,
  detail,
  ctaLabel,
  href,
}: {
  icon: React.ReactNode;
  pillar: string;
  subtitle: string;
  stat: string;
  statLabel: string;
  due?: boolean;
  detail: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-card relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-[var(--brand-hairline)] p-5 transition-colors hover:border-[var(--brand-inchiostro-soft)]/40 sm:p-6"
    >
      <div className="flex items-center gap-2.5">
        <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="font-display text-foreground block text-[17px] font-semibold tracking-tight">
            {pillar}
          </span>
          <span className="text-muted-foreground block truncate text-[12.5px]">{subtitle}</span>
        </span>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-display text-[34px] leading-none font-semibold tracking-tight tabular-nums",
            due ? "text-primary" : "text-foreground",
          )}
        >
          {stat}
        </span>
        <span className="text-muted-foreground text-[13px]">{statLabel}</span>
      </div>

      <p className="text-muted-foreground -mt-1 text-[13px] leading-relaxed">{detail}</p>

      <span className="text-foreground mt-auto inline-flex items-center gap-1.5 text-[13.5px] font-medium">
        {ctaLabel}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function ConciergeTools({ data }: { data: ConciergeToolsData }) {
  const { alloggiati: a, turismo: t } = data;
  const allStat = a.pending > 0 ? `${a.pending}` : "0";
  const allDetail =
    a.pending > 0
      ? a.overdue > 0
        ? `${a.overdue} oltre la scadenza: gestisci l'invio ad Alloggiati Web.`
        : "In coda su mandato Alloggiati: con l'auto-invio attivo partono da sole."
      : "Nessuna schedina in coda: l'outbox è pulito.";

  const turStat = t.istatTotal > 0 ? `${t.istatReady}/${t.istatTotal}` : "—";
  const turDetail =
    t.istatTotal > 0
      ? `Tracciato del mese pronto per le strutture complete.${
          t.taxEuros > 0 ? ` Tassa di soggiorno: €${t.taxEuros} maturati.` : ""
        }`
      : "Aggiungi una struttura per preparare il movimento turistico.";

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <ToolCard
        icon={<ScrollText className="size-5" />}
        pillar="Alloggiati"
        subtitle="Schedine alla Questura"
        stat={allStat}
        statLabel={a.pending === 1 ? "schedina in coda" : "schedine in coda"}
        due={a.overdue > 0}
        detail={allDetail}
        ctaLabel="Apri le schedine"
        href="/schedine"
      />
      <ToolCard
        icon={<BarChart3 className="size-5" />}
        pillar="Turismo"
        subtitle={`Movimento ISTAT · ${t.monthLabel}`}
        stat={turStat}
        statLabel="strutture pronte"
        detail={turDetail}
        ctaLabel="Apri il movimento ISTAT"
        href="/istat"
      />
    </div>
  );
}

/**
 * Testata per i PROPERTY MANAGER: porta in cima le strutture che hanno qualcosa da fare
 * (solo-chi-ha-da-fare, ordinate per urgenza) con un colpo d'occhio e l'ingresso alla vista
 * strutture completa. Riusa i dati `properties` già caricati per la dashboard.
 */
export function ConciergePmLead({ properties }: { properties: PropertyStatus[] }) {
  const total = properties.length;
  const withWork = properties
    .filter((p) => p.pendingSchedine > 0 || p.status === "err")
    .sort((x, y) => y.pendingSchedine - x.pendingSchedine)
    .slice(0, 4);

  return (
    <div className="bg-card rounded-2xl border border-[var(--brand-hairline)] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
            <Building2 className="size-5" />
          </span>
          <div>
            <span className="font-display text-foreground block text-[17px] font-semibold tracking-tight">
              {total} {total === 1 ? "struttura" : "strutture"} in gestione
            </span>
            <span className="text-muted-foreground block text-[12.5px]">
              {withWork.length > 0
                ? `${withWork.length} ${withWork.length === 1 ? "con qualcosa" : "con qualcosa"} da fare`
                : "tutte in pari"}
            </span>
          </div>
        </div>
        <Link
          href="/agency"
          className="text-foreground inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--brand-hairline)] bg-[var(--brand-avorio)]/60 px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-[var(--brand-avorio)]"
        >
          Vista strutture
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {withWork.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {withWork.map((p) => (
            <li key={p.id}>
              <Link
                href="/agency"
                className="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--brand-avorio)]"
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    p.status === "err" ? "bg-destructive" : "bg-warning",
                  )}
                />
                <span className="text-foreground min-w-0 flex-1 truncate text-[13.5px] font-medium">
                  {p.name}
                  {p.city && <span className="text-muted-foreground font-normal"> · {p.city}</span>}
                </span>
                <span className="text-muted-foreground shrink-0 text-[12.5px] tabular-nums">
                  {p.pendingSchedine > 0 ? `${p.pendingSchedine} in coda` : "richiede attenzione"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
