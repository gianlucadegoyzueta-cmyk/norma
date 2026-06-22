import type { ReactNode } from "react";
import Link from "next/link";
import { SealMark } from "@/components/ui/seal-mark";
import { ConciergeHero, type HeroSegment } from "@/components/dashboard/concierge-hero";
import { ConciergeKpis, type KpiSpec } from "@/components/dashboard/concierge-kpis";
import { ConciergeBoard } from "@/components/dashboard/concierge-board";
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
  /** Slot a destra dell'header (es. form di logout). */
  signOutSlot?: ReactNode;
}

/**
 * Scena completa "Concierge MAX": grana, sigillo in filigrana, header, hero, KPI, board.
 * Presentazionale: riceve dati già pronti. Identità carta chiara SEMPRE (classe `.cmx`).
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

      <a
        href="#main-content"
        className="bg-card text-foreground focus-visible:ring-ring sr-only rounded-md px-4 py-2 shadow focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-50 focus:ring-2"
      >
        Salta al contenuto
      </a>

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

        <header className="cmx-top">
          <div className="cmx-brand">
            <SealMark />
            <span>Norma</span>
          </div>
          <div className="cmx-top-right">
            <div className="cmx-presence" title={orgName}>
              <svg className="cmx-pen" viewBox="0 0 20 20" aria-hidden>
                <path d="M2 14 C5 8, 9 12, 12 7 S 17 6, 18 4" />
              </svg>
              {lastCheck ? `Al lavoro per te — ultima verifica ${lastCheck}` : "Al lavoro per te"}
            </div>
            {signOutSlot}
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="outline-none">
          <ConciergeHero kicker={kicker} lines={lines} sub={sub} />

          {/* Barra di accesso rapido: in evidenza, centrata, sopra i KPI (non più persa in fondo). */}
          <nav className="cmx-quicknav" aria-label="Vai a una sezione">
            <span className="cmx-sc-label">Vai a</span>
            <span className="cmx-quicknav-pills">
              <Link className="cmx-sc" href="/agency">
                Strutture
              </Link>
              <Link className="cmx-sc" href="/schedine">
                Schedine
              </Link>
              <Link className="cmx-sc" href="/stays">
                Soggiorni
              </Link>
              <Link className="cmx-sc" href="/properties">
                Immobili
              </Link>
              <Link className="cmx-sc" href="/tourist-tax">
                Tassa di soggiorno
              </Link>
              <Link className="cmx-sc" href="/istat">
                ISTAT
              </Link>
              <Link className="cmx-sc" href="/credentials">
                Credenziali
              </Link>
            </span>
          </nav>

          <ConciergeKpis kpis={kpis} />
          <ConciergeBoard proposals={proposals} agenda={agenda} diary={diary} />
        </main>
      </div>
    </div>
  );
}
