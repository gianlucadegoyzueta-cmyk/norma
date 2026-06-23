import type { ReactNode } from "react";
import { ConciergeHero, type HeroSegment } from "@/components/dashboard/concierge-hero";
import { ConciergeKpis, type KpiSpec } from "@/components/dashboard/concierge-kpis";
import { ConciergeBoard } from "@/components/dashboard/concierge-board";
import { AppShell } from "@/components/shell/app-shell";
import type {
  DashboardAgendaItem,
  DashboardDiaryRow,
  DashboardProposal,
} from "@/app/dashboard/_lib/data";

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
  /** Slot a destra della topbar (es. form di logout). */
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
  signOutSlot,
}: ConciergeSceneProps) {
  return (
    <AppShell
      actions={
        <>
          <div
            title={orgName}
            className="bg-card text-muted-foreground hidden items-center gap-2 rounded-full border border-[var(--brand-hairline)] px-3 py-1.5 text-[12.5px] md:flex"
          >
            <span className="size-1.5 rounded-full bg-[var(--brand-salvia)]" />
            {lastCheck ? `Al lavoro per te · ${lastCheck}` : "Al lavoro per te"}
          </div>
          {signOutSlot}
        </>
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
          {/* La navigazione rapida del vecchio layout è sostituita dalla sidebar persistente
              dell'AppShell (#105): copre Strutture/Agency, Soggiorni, Schedine, ISTAT, Immobili,
              Credenziali, Tassa di soggiorno. KPI come striscia di contesto dentro il board. */}
          <ConciergeBoard
            proposals={proposals}
            agenda={agenda}
            diary={diary}
            kpisSlot={<ConciergeKpis kpis={kpis} />}
          />
        </div>
      </div>
    </AppShell>
  );
}
