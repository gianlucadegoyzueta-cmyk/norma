import Link from "next/link";
import type { SchedinaStatus } from "@prisma/client";
import { isOverdue } from "@/lib/schedina-status";
import { schedinaStatusDisplay } from "@/lib/schedina-status-display";
import { cn } from "@/lib/utils";
import { ReopenNeedsReviewButton } from "@/components/reopen-needs-review-button";
import { ReopenRejectedButton } from "@/components/reopen-rejected-button";
import { UnverifiedNote } from "@/components/unverified-note";
import { Button } from "@/components/ui/button";
import { mapAlloggiatiError } from "./error-codes";

// Lista densa dell'outbox schedine (stile tabella Studio, "Carta & Inchiostro").
// SOLO presentazione: l'invio irreversibile vive in CredentialOutboxControls (altrove, intatto).
// Qui ci sono solo lo stato, la scadenza e le azioni di RI-APERTURA (reversibili) preservate
// byte-per-byte dalla versione a card.
// Lo stato è reso dalla sorgente UNICA `schedinaStatusDisplay` (#111): niente mappa duplicata,
// così NEEDS_REVIEW resta "Da rivedere" (err) e non torna il bug "No schedina".
type SchedinaRow = {
  id: string;
  status: SchedinaStatus;
  guestName: string;
  propertyName: string;
  credentialLabel: string;
  deadlineAt: Date;
  lastErrorCod: string | null;
  lastErrorDes: string | null;
};

const dateTimeFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return (
    parts
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function Deadline({ deadlineAt, overdue }: { deadlineAt: Date; overdue: boolean }) {
  return (
    <span
      style={{
        color: overdue ? "var(--terracotta-dark)" : "var(--soft)",
        fontWeight: overdue ? 600 : 400,
      }}
    >
      {overdue ? "scaduta " : "entro "}
      {dateTimeFmt.format(deadlineAt)}
    </span>
  );
}

export function SchedineList({
  schedine,
  stayIdBySchedina,
  now,
}: {
  schedine: SchedinaRow[];
  stayIdBySchedina: Map<string, string>;
  now: number;
}) {
  if (schedine.length === 0) {
    return (
      <div className="cmx-empty">
        <p className="cmx-empty-title">Nessuna schedina, per ora</p>
        <p className="cmx-empty-text">
          Quando aggiungi un soggiorno, preparo qui le schedine pronte da confermare. Inizia da un{" "}
          <Link href="/stays" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
            soggiorno
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border shadow-sm">
      {/* Intestazione colonne (desktop) */}
      <div className="border-border text-muted-foreground hidden items-center gap-3 border-b bg-[var(--brand-avorio)]/50 px-4 py-2.5 text-[11px] font-medium tracking-[0.06em] uppercase sm:flex">
        <span className="flex-1">Ospite</span>
        <span className="w-56 shrink-0">Struttura</span>
        <span className="w-28 shrink-0">Stato</span>
        <span className="w-44 shrink-0">Scadenza</span>
      </div>

      <ul>
        {schedine.map((s) => {
          const overdue = isOverdue(s, now);
          const stayId = stayIdBySchedina.get(s.id);
          return (
            <li key={s.id}>
              <div
                className={cn(
                  "border-border/60 relative border-b px-4 py-3 last:border-0",
                  overdue && "bg-[var(--brand-terracotta)]/[0.04]",
                )}
              >
                {overdue && (
                  <span className="absolute inset-y-0 left-0 w-[2.5px] bg-[var(--brand-terracotta)]" />
                )}

                {/* Riga principale */}
                <div className="flex items-center gap-3">
                  {/* Ospite */}
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-salvia-soft)] text-[11px] font-medium text-[var(--brand-salvia)]">
                      {initials(s.guestName)}
                    </span>
                    <div className="min-w-0">
                      <span className="text-foreground block truncate text-[13.5px] font-medium">
                        {s.guestName}
                      </span>
                      <span className="text-muted-foreground block truncate text-[11.5px] sm:hidden">
                        {s.propertyName} · {s.credentialLabel}
                      </span>
                    </div>
                  </div>

                  {/* Struttura (desktop) */}
                  <div className="hidden w-56 shrink-0 sm:block">
                    <span className="text-foreground block truncate text-[12.5px]">
                      {s.propertyName}
                    </span>
                    <span className="text-muted-foreground block truncate text-[11.5px]">
                      {s.credentialLabel}
                    </span>
                  </div>

                  {/* Stato */}
                  <div className="w-28 shrink-0">
                    <span className={cn("cmx-badge", schedinaStatusDisplay(s.status).badgeClass)}>
                      {schedinaStatusDisplay(s.status).label}
                    </span>
                  </div>

                  {/* Scadenza (desktop) */}
                  <div className="hidden w-44 shrink-0 font-mono text-[12px] sm:block">
                    <Deadline deadlineAt={s.deadlineAt} overdue={overdue} />
                  </div>
                </div>

                {/* Scadenza (mobile) */}
                <div className="mt-1.5 font-mono text-[11px] sm:hidden">
                  <Deadline deadlineAt={s.deadlineAt} overdue={overdue} />
                </div>

                {/* Sotto-sezioni condizionali (preservate dalla versione a card) */}
                {s.status === "REJECTED" && (
                  <div
                    className="mt-3 grid gap-1.5 border-t pt-3"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    <p className="text-xs" style={{ color: "var(--terracotta-dark)" }}>
                      {s.lastErrorCod ? (
                        <span style={{ color: "var(--soft)" }}>[{s.lastErrorCod}] </span>
                      ) : null}
                      {mapAlloggiatiError(s.lastErrorCod, s.lastErrorDes)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {stayId ? (
                        <Link href={`/stays/${stayId}`}>
                          <Button variant="outline" size="sm">
                            Correggi
                          </Button>
                        </Link>
                      ) : null}
                      <ReopenRejectedButton schedinaId={s.id} />
                    </div>
                  </div>
                )}
                {s.status === "UNVERIFIED" && (
                  <div className="mt-3 border-t pt-3" style={{ borderColor: "var(--hairline)" }}>
                    <UnverifiedNote />
                  </div>
                )}
                {s.status === "NEEDS_REVIEW" && (
                  <div
                    className="mt-3 grid gap-1.5 border-t pt-3"
                    style={{ borderColor: "var(--hairline)" }}
                  >
                    <p className="text-xs" style={{ color: "var(--soft)" }}>
                      Tentativi di invio esauriti: controlla i dati della schedina, poi rimettila in
                      coda.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {stayId ? (
                        <Link href={`/stays/${stayId}`}>
                          <Button variant="outline" size="sm">
                            Apri soggiorno
                          </Button>
                        </Link>
                      ) : null}
                      <ReopenNeedsReviewButton schedinaId={s.id} />
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
