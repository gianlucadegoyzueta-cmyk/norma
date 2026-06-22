import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  CalendarX2,
  ChevronRight,
  Download,
  Users,
} from "lucide-react";
import type { ReservationSource, StayImportStatus } from "@prisma/client";
import { deriveImportProvenance, type ImportNotice } from "@/server/modules/stays";
import { NO_SCHEDINA_LABEL } from "@/lib/schedina-status-display";

// Lista densa dei soggiorni (stile tabella Studio, vestita "Carta & Inchiostro").
// Presentazionale: ogni riga è un Link alla pagina di dettaglio — nessuna logica/azione qui.
// Il tipo è strutturale (sottoinsieme di StayListItem) per restare disaccoppiati.
// Preserva la provenienza iCal (#112: deriveImportProvenance + ImportNoticeBadge) e il
// conteggio `needsReview` + `NO_SCHEDINA_LABEL` (#111).
type StayRow = {
  id: string;
  propertyName: string;
  comuneName: string;
  provincia: string;
  arrivalDate: Date;
  departureDate: Date | null;
  isShortStay: boolean;
  guestsCount: number;
  guestsAdded: number;
  schedine: {
    total: number;
    acquired: number;
    pending: number;
    sending: number;
    rejected: number;
    unverified: number;
    needsReview: number;
  };
  importSource: ReservationSource | null;
  importStatus: StayImportStatus | null;
};

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Rome",
});

function dateRange(arrival: Date, departure: Date | null): string {
  return `${dateFmt.format(arrival)}${departure ? ` → ${dateFmt.format(departure)}` : ""}`;
}

/** Badge di "richiamo" per i soggiorni importati che richiedono attenzione (annulli/da completare). */
function ImportNoticeBadge({ notice }: { notice: ImportNotice }) {
  if (notice.kind === "cancelled") {
    return (
      <span className="cmx-badge cmx-badge-err inline-flex items-center gap-1">
        <CalendarX2 className="size-3 shrink-0" aria-hidden />
        Annullata dal calendario
      </span>
    );
  }
  if (notice.kind === "needs-cancel-review") {
    return (
      <span className="cmx-badge cmx-badge-err inline-flex items-center gap-1">
        <AlertTriangle className="size-3 shrink-0" aria-hidden />
        Verifica annullamento
      </span>
    );
  }
  // draft-empty: bozza importata senza ospiti, da completare.
  return (
    <span className="cmx-badge cmx-badge-wait inline-flex items-center gap-1">
      <Download className="size-3 shrink-0" aria-hidden />
      Ospiti da inserire
    </span>
  );
}

function SchedineBadges({ s }: { s: StayRow["schedine"] }) {
  if (s.total === 0) {
    return <span className="cmx-badge cmx-badge-wait">{NO_SCHEDINA_LABEL}</span>;
  }
  return (
    <>
      {s.acquired > 0 && <span className="cmx-badge cmx-badge-ok">{s.acquired} acquisite</span>}
      {s.pending > 0 && <span className="cmx-badge cmx-badge-wait">{s.pending} da inviare</span>}
      {s.sending > 0 && <span className="cmx-badge cmx-badge-wait">{s.sending} in invio</span>}
      {s.rejected > 0 && <span className="cmx-badge cmx-badge-err">{s.rejected} respinte</span>}
      {s.unverified > 0 && (
        <span className="cmx-badge cmx-badge-wait">{s.unverified} da verificare</span>
      )}
      {s.needsReview > 0 && (
        <span className="cmx-badge cmx-badge-err">{s.needsReview} da rivedere</span>
      )}
    </>
  );
}

export function StaysList({ stays }: { stays: StayRow[] }) {
  if (stays.length === 0) {
    return (
      <div className="cmx-empty">
        <p className="cmx-empty-title">Nessun soggiorno, per ora</p>
        <p className="cmx-empty-text">
          Creane uno qui sotto: scegli l&apos;immobile e le date, poi aggiungi gli ospiti.
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      {/* Intestazione colonne (desktop) */}
      <div className="border-border text-muted-foreground hidden items-center gap-3 border-b bg-[var(--brand-avorio)]/50 px-4 py-2.5 text-[11px] font-medium tracking-[0.06em] uppercase sm:flex">
        <span className="flex-1">Immobile</span>
        <span className="w-52 shrink-0">Date</span>
        <span className="w-20 shrink-0">Ospiti</span>
        <span className="w-44 shrink-0">Schedine</span>
        <span className="w-4 shrink-0" aria-hidden />
      </div>

      <ul>
        {stays.map((s) => {
          const provenance = deriveImportProvenance({
            importSource: s.importSource,
            importStatus: s.importStatus,
            guestsAdded: s.guestsAdded,
          });
          return (
            <li key={s.id}>
              <Link
                href={`/stays/${s.id}`}
                className="group border-border/60 flex items-center gap-3 border-b px-4 py-3 transition-colors outline-none last:border-0 hover:bg-[var(--brand-avorio)]/70 focus-visible:bg-[var(--brand-avorio)]/70"
              >
                {/* Immobile */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-salvia-soft)] text-[var(--brand-salvia)]">
                    <Building2 className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="text-foreground block truncate text-[13.5px] font-medium">
                      {s.propertyName}
                    </span>
                    <span className="text-muted-foreground block truncate text-[11.5px]">
                      {s.comuneName} · {s.provincia}
                      {provenance.sourceLabel ? ` · ${provenance.sourceLabel}` : ""}
                    </span>
                    {/* Meta su mobile (le colonne Date/Ospiti sono nascoste) */}
                    <span className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] sm:hidden">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3 shrink-0" aria-hidden />
                        {dateRange(s.arrivalDate, s.departureDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3 shrink-0" aria-hidden />
                        {s.guestsAdded}/{s.guestsCount}
                      </span>
                      {s.isShortStay && <span>· breve</span>}
                    </span>
                  </span>
                </div>

                {/* Date (desktop) */}
                <div className="hidden w-52 shrink-0 sm:block">
                  <span className="text-foreground flex items-center gap-1.5 font-mono text-[12.5px]">
                    <CalendarDays className="text-muted-foreground size-3 shrink-0" aria-hidden />
                    {dateRange(s.arrivalDate, s.departureDate)}
                  </span>
                  {s.isShortStay && (
                    <span className="text-muted-foreground mt-0.5 block text-[11px]">
                      breve (≤24h)
                    </span>
                  )}
                </div>

                {/* Ospiti (desktop) */}
                <span className="text-foreground hidden w-20 shrink-0 items-center gap-1.5 font-mono text-[12.5px] sm:flex">
                  <Users className="text-muted-foreground size-3 shrink-0" aria-hidden />
                  {s.guestsAdded}/{s.guestsCount}
                </span>

                {/* Schedine + richiamo provenienza */}
                <div className="flex w-32 shrink-0 flex-wrap justify-end gap-1.5 sm:w-44 sm:justify-start">
                  {provenance.notice && <ImportNoticeBadge notice={provenance.notice} />}
                  <SchedineBadges s={s.schedine} />
                </div>

                {/* Chevron (desktop) */}
                <ChevronRight
                  className="text-muted-foreground/50 group-hover:text-muted-foreground hidden size-4 shrink-0 transition-colors sm:block"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
