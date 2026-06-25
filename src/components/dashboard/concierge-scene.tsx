import type { ReactNode } from "react";
import { ConciergeHero, type HeroSegment } from "@/components/dashboard/concierge-hero";
import { ConciergeKpis, type KpiSpec } from "@/components/dashboard/concierge-kpis";
import {
  ConciergePmLead,
  ConciergeTools,
  type ConciergeToolsData,
} from "@/components/dashboard/concierge-tools";
import { ConciergeBoard } from "@/components/dashboard/concierge-board";
import { AppShell } from "@/components/shell/app-shell";
import type {
  DashboardAgendaItem,
  DashboardDiaryRow,
  DashboardProposal,
} from "@/app/dashboard/_lib/data";
import type { PropertyStatus } from "@/components/dashboard/concierge-properties";
import type { ComplianceMonth } from "@/components/dashboard/concierge-compliance";

export interface ConciergeSceneProps {
  orgName: string;
  /** Etichetta "ultima verifica HH:MM" nella pill di presenza (null = nessuna verifica oggi). */
  lastCheck: string | null;
  kicker: string;
  lines: HeroSegment[][];
  sub: { text: string; bold?: string };
  kpis: KpiSpec[];
  proposals: DashboardProposal[];
  agenda: DashboardAgendaItem[];
  diary: DashboardDiaryRow[];
  /** Stato per-struttura (lista "Le tue strutture"). Opzionale: assente = pannello non reso. */
  properties?: PropertyStatus[];
  /** Posizione compliance a 12 mesi. Opzionale: assente = pannello non reso. */
  compliance?: { months: ComplianceMonth[]; summary: string };
  /** Riepilogo dei due pilastri per gli strumenti grandi in testa (home prodotto-first). */
  tools: ConciergeToolsData;
  /** Tipo di home: host singolo (due strumenti) o property manager (testata per-struttura). */
  audience?: "host" | "pm";
  /** Utente per il menu in alto (nome/email/iniziali). */
  user?: { name: string; email?: string; initials: string };
  /** Slot logout: finisce nel menu utente della barra in alto. */
  signOutSlot?: ReactNode;
}

/**
 * Dashboard "Concierge MAX" montata dentro l'AppShell (sidebar + topbar). La topbar ospita
 * la pill di presenza ("al lavoro per te") e il logout; il contenuto (hero, KPI, board) resta
 * nel linguaggio .cmx (grana, sigillo). Presentazionale: riceve dati già pronti.
 */
export function ConciergeScene({
  orgName,
  lastCheck,
  kicker,
  lines,
  sub,
  kpis,
  proposals,
  agenda,
  diary,
  properties,
  compliance,
  tools,
  audience = "host",
  user,
  signOutSlot,
}: ConciergeSceneProps) {
  return (
    <AppShell
      workspace={{ name: orgName }}
      user={user}
      signOutSlot={signOutSlot}
      actions={
        <div
          title={orgName}
          className="bg-card text-muted-foreground hidden items-center gap-2 rounded-full border border-[var(--brand-hairline)] px-3 py-1.5 text-[12.5px] md:flex"
        >
          <span className="size-1.5 rounded-full bg-[var(--brand-salvia)]" />
          {lastCheck ? `Al lavoro per te · ${lastCheck}` : "Al lavoro per te"}
        </div>
      }
    >
      <div className="cmx">
        {/* Grana carta (feTurbulence fissa, puramente decorativa) */}
        <svg className="cmx-grain" aria-hidden>
          <filter id="cmx-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves={2}
              stitchTiles="stitch"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.13 0 0 0 0 0.11 0 0 0 0 0.08 0 0 0 0.05 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#cmx-noise)" />
        </svg>

        <div className="cmx-wrap">
          {/* Sigillo guilloche in filigrana dietro la testata (rotazione lenta 240s) */}
          <div className="cmx-seal-bg" aria-hidden>
            <svg viewBox="0 0 200 200" fill="none" stroke="#211c15" strokeWidth="0.35">
              <circle cx="100" cy="100" r="96" />
              <circle cx="100" cy="100" r="88" strokeDasharray="1 3" />
              <circle cx="100" cy="100" r="78" strokeDasharray="6 4" />
              <circle cx="100" cy="100" r="66" strokeDasharray="1 2" />
              <circle cx="100" cy="100" r="55" />
              <circle cx="100" cy="100" r="44" strokeDasharray="8 3" />
              <g strokeDasharray="1 5">
                <circle cx="100" cy="100" r="34" />
                <circle cx="100" cy="100" r="24" />
              </g>
            </svg>
          </div>

          <ConciergeHero kicker={kicker} lines={lines} sub={sub} />
          {/* Home prodotto-first: i DUE pilastri come strumenti grandi in testa (host), oppure la
              testata per-struttura (property manager). Il box marketing "Norma esegue per te" è
              stato rimosso (PARTE 6/FASE 2): la garanzia vive sul sito, non nel prodotto. */}
          <div className="mt-5 mb-2 space-y-3">
            {audience === "pm" && properties && properties.length > 0 && (
              <ConciergePmLead properties={properties} />
            )}
            <ConciergeTools data={tools} />
          </div>
          <ConciergeBoard
            proposals={proposals}
            agenda={agenda}
            diary={diary}
            properties={properties}
            compliance={compliance}
            kpisSlot={<ConciergeKpis kpis={kpis} />}
          />
        </div>
      </div>
    </AppShell>
  );
}
