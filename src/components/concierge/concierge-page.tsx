import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { cn } from "@/lib/utils";
import "@/app/dashboard/concierge.css";
import "./concierge-page.css";

export interface ConciergePageProps {
  /** H1 della pagina. Supporta <em> per l'accento terracotta corsivo. */
  title: ReactNode;
  /** Sopra-titolo opzionale in maiuscoletto spaziato (es. "OUTBOX · ALLOGGIATI WEB"). */
  kicker?: string;
  /** Sottotitolo opzionale. */
  intro?: ReactNode;
  /** Mantenuti per compatibilità con i chiamanti: con la sidebar persistente il "torna"
   *  non serve più, ma le pagine possono ancora passarli senza errori. */
  backHref?: string;
  backLabel?: string;
  /** Azioni opzionali nella topbar (a destra). */
  actions?: ReactNode;
  /** Voce di navigazione attiva nella sidebar (es. "schedine"). */
  active?: string;
  /**
   * Variante "strumento" per le pagine operative (direzione estetica: app densa, marketing
   * editoriale — vedi docs/design/DIRECTION.md). Titolo sans sobrio, niente grana/sigillo
   * decorativi. Le utility .cmx (badge, sezioni, righe) restano disponibili al contenuto.
   */
  dense?: boolean;
  children: ReactNode;
}

/**
 * Guscio "Concierge" riusabile per le pagine interne, ora montato dentro l'AppShell
 * (sidebar persistente + topbar). Per default conserva il linguaggio .cmx editoriale (grana,
 * sigillo, titolo serif); con `dense` adotta la testata sobria da strumento. Presentazionale e PII-free.
 */
export function ConciergePage({
  title,
  kicker,
  intro,
  actions,
  active,
  dense,
  children,
}: ConciergePageProps) {
  return (
    <AppShell actions={actions} active={active}>
      <div className="cmx">
        {/* Grana carta decorativa (solo variante editoriale). */}
        {!dense && (
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
        )}

        <div className={cn("cmx-wrap", dense && "cmx-wrap-dense")}>
          {/* Sigillo guilloche in filigrana dietro la testata (solo variante editoriale). */}
          {!dense && (
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
          )}

          {dense ? (
            <header className="relative z-[2] mb-7 max-w-3xl">
              {kicker ? (
                <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--soft)] uppercase">
                  {kicker}
                </p>
              ) : null}
              <h1 className="mt-1.5 text-[23px] font-semibold tracking-[-0.01em] text-[var(--inchiostro)] sm:text-[25px]">
                {title}
              </h1>
              {intro ? (
                <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-[var(--soft)]">
                  {intro}
                </p>
              ) : null}
            </header>
          ) : (
            <div className="cmx-pagehead">
              {kicker ? (
                <div className="cmx-kicker">
                  <span className="cmx-kicker-text">{kicker}</span>
                </div>
              ) : null}
              <h1 className="cmx-pagetitle">{title}</h1>
              {intro ? <p className="cmx-pagesub">{intro}</p> : null}
            </div>
          )}
          {children}
        </div>
      </div>
    </AppShell>
  );
}
