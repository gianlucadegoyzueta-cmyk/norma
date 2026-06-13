import type { ReactNode } from "react";
import Link from "next/link";
import "@/app/dashboard/concierge.css";
import "./concierge-page.css";

export interface ConciergePageProps {
  /** H1 della pagina. Supporta <em> per l'accento terracotta corsivo. */
  title: ReactNode;
  /** Sopra-titolo opzionale in maiuscoletto spaziato (es. "OUTBOX · ALLOGGIATI WEB"). */
  kicker?: string;
  /** Sottotitolo opzionale. */
  intro?: ReactNode;
  /** Dove torna il link in alto a destra. Default: dashboard. */
  backHref?: string;
  backLabel?: string;
  /** Azioni opzionali a destra dell'header (oltre al link "torna"). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Guscio "Concierge" riusabile per le pagine interne: grana di carta, sigillo in filigrana,
 * header con marchio Norma, testata editoriale a sinistra. Stesso linguaggio della dashboard
 * (classe `.cmx`), così tutta l'app è coerente al livello massimo. Presentazionale e PII-free.
 */
export function ConciergePage({
  title,
  kicker,
  intro,
  backHref = "/dashboard",
  backLabel = "Dashboard",
  actions,
  children,
}: ConciergePageProps) {
  return (
    <div className="cmx">
      {/* Grana carta decorativa (uguale alla dashboard). */}
      <svg className="cmx-grain" aria-hidden>
        <filter id="cmx-noise-page">
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
        <rect width="100%" height="100%" filter="url(#cmx-noise-page)" />
      </svg>

      <a
        href="#main-content"
        className="bg-card text-foreground focus-visible:ring-ring sr-only rounded-md px-4 py-2 shadow focus:not-sr-only focus:absolute focus:top-2 focus:left-4 focus:z-50 focus:ring-2"
      >
        Salta al contenuto
      </a>

      <div className="cmx-wrap">
        {/* Sigillo guilloche in filigrana dietro la testata. */}
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
          <Link className="cmx-brand" href="/dashboard" aria-label="Norma — dashboard">
            <svg viewBox="0 0 40 40" fill="none" aria-hidden>
              <path
                d="M 37.00 20.00 A 8.84 8.84 0 0 1 35.32 27.38 A 8.84 8.84 0 0 1 30.60 33.29 A 8.84 8.84 0 0 1 23.78 36.57 A 8.84 8.84 0 0 1 16.22 36.57 A 8.84 8.84 0 0 1 9.40 33.29 A 8.84 8.84 0 0 1 4.68 27.38 A 8.84 8.84 0 0 1 3.00 20.00 A 8.84 8.84 0 0 1 4.68 12.62 A 8.84 8.84 0 0 1 9.40 6.71 A 8.84 8.84 0 0 1 16.22 3.43 A 8.84 8.84 0 0 1 23.78 3.43 A 8.84 8.84 0 0 1 30.60 6.71 A 8.84 8.84 0 0 1 35.32 12.62 A 8.84 8.84 0 0 1 37.00 20.00 Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle
                cx="20"
                cy="20"
                r="12.2"
                stroke="currentColor"
                strokeWidth="0.9"
                opacity="0.45"
              />
              <g
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M13.4 26.6V13.4" />
                <path d="M13.4 13.4L26.6 26.6" />
                <path d="M26.6 26.6V16.4L24.2 14" />
              </g>
            </svg>
            <span>Norma</span>
          </Link>
          <div className="cmx-top-right">
            {actions}
            <Link className="cmx-back" href={backHref}>
              ← {backLabel}
            </Link>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="outline-none">
          <div className="cmx-pagehead">
            {kicker ? (
              <div className="cmx-kicker">
                <span className="cmx-kicker-text">{kicker}</span>
              </div>
            ) : null}
            <h1 className="cmx-pagetitle">{title}</h1>
            {intro ? <p className="cmx-pagesub">{intro}</p> : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
