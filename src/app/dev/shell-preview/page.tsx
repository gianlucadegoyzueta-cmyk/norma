import { notFound } from "next/navigation";
import { Check, ChevronRight, Filter, RefreshCw, Search, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/shell/app-shell";

// Anteprima NON di produzione del nuovo guscio app (sidebar + lista densa "Schedine"),
// per screenshottare la direzione senza login né DB. 404 in produzione.
export const dynamic = "force-dynamic";

type Status = "pronta" | "verificare" | "acquisita" | "errore";

const STATUS: Record<Status, { label: string; dot: string; fg: string; bg: string }> = {
  pronta: {
    label: "Pronta",
    dot: "bg-[var(--brand-salvia)]",
    fg: "text-[var(--brand-salvia)]",
    bg: "bg-[var(--brand-salvia-soft)]",
  },
  verificare: {
    label: "Da verificare",
    dot: "bg-warning",
    fg: "text-warning-foreground",
    bg: "bg-warning/15",
  },
  acquisita: {
    label: "Acquisita",
    dot: "bg-success",
    fg: "text-success",
    bg: "bg-success/12",
  },
  errore: {
    label: "Errore",
    dot: "bg-destructive",
    fg: "text-destructive",
    bg: "bg-destructive/12",
  },
};

function StatusBadge({ status }: { status: Status }) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium",
        s.bg,
        s.fg,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

type Row = {
  initials: string;
  name: string;
  country: string;
  docType: string;
  docNo: string;
  property: string;
  arrival: string;
  nights: string;
  status: Status;
};

const ROWS: Row[] = [
  {
    initials: "LD",
    name: "Léa Dubois",
    country: "Francia",
    docType: "Passaporto",
    docNo: "YA1234567",
    property: "Villa Vista",
    arrival: "13 giu 2026",
    nights: "2 notti",
    status: "pronta",
  },
  {
    initials: "MB",
    name: "Marco Bianchi",
    country: "Italia",
    docType: "Carta d'identità",
    docNo: "CA98765AB",
    property: "Lago Suite",
    arrival: "13 giu 2026",
    nights: "4 notti",
    status: "pronta",
  },
  {
    initials: "SK",
    name: "Sofia Keller",
    country: "Germania",
    docType: "Passaporto",
    docNo: "C01X4F2Z9",
    property: "Villa Vista",
    arrival: "12 giu 2026",
    nights: "3 notti",
    status: "verificare",
  },
  {
    initials: "JO",
    name: "James O'Connor",
    country: "Irlanda",
    docType: "Passaporto",
    docNo: "PX7782341",
    property: "Borgo 7",
    arrival: "12 giu 2026",
    nights: "5 notti",
    status: "pronta",
  },
  {
    initials: "YT",
    name: "Yuki Tanaka",
    country: "Giappone",
    docType: "Passaporto",
    docNo: "TK0099123",
    property: "Lago Suite",
    arrival: "11 giu 2026",
    nights: "2 notti",
    status: "pronta",
  },
  {
    initials: "AN",
    name: "Anna Novák",
    country: "Rep. Ceca",
    docType: "Carta d'identità",
    docNo: "99AA1122C",
    property: "Villa Vista",
    arrival: "11 giu 2026",
    nights: "6 notti",
    status: "verificare",
  },
  {
    initials: "PA",
    name: "Pedro Álvarez",
    country: "Spagna",
    docType: "Passaporto",
    docNo: "ESP551200",
    property: "Borgo 7",
    arrival: "10 giu 2026",
    nights: "3 notti",
    status: "pronta",
  },
  {
    initials: "ES",
    name: "Emma Schmidt",
    country: "Austria",
    docType: "Passaporto",
    docNo: "AU2233447",
    property: "Lago Suite",
    arrival: "10 giu 2026",
    nights: "2 notti",
    status: "acquisita",
  },
];

const GRID = "grid grid-cols-[36px_1.7fr_1.4fr_1fr_0.95fr_auto_28px] items-center gap-3";
const SELECTED = new Set([2, 5]); // righe selezionate (per mostrare lo stato + batch bar)

function Checkbox({ checked, indeterminate }: { checked?: boolean; indeterminate?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-[18px] items-center justify-center rounded-[5px] border transition-colors",
        checked || indeterminate
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card border-[var(--brand-hairline)]",
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
      {indeterminate && <span className="bg-primary-foreground h-0.5 w-2 rounded-full" />}
    </span>
  );
}

export default function ShellPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const tabs = [
    { label: "Da inviare", count: 8, active: true },
    { label: "Da verificare", count: 3, active: false },
    { label: "Acquisite", count: 142, active: false },
  ];

  return (
    <AppShell
      active="schedine"
      workspace={{ name: "Villa Vista · Como", sub: "3 strutture" }}
      user={{ name: "Gianluca", email: "gianluca@norma.casa", initials: "GD" }}
      breadcrumb={
        <>
          <span className="text-foreground/70">Villa Vista · Como</span>
          <ChevronRight className="text-muted-foreground/50 size-3.5" />
          <span className="text-foreground font-medium">Schedine</span>
        </>
      }
      actions={
        <>
          <button
            aria-label="Aggiorna"
            className="bg-card text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-lg border border-[var(--brand-hairline)] transition-colors"
          >
            <RefreshCw className="size-4" />
          </button>
          <Button size="sm" className="h-9 gap-1.5">
            <Sparkles className="size-4" />
            Genera schedine
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-[1180px] px-6 py-7 lg:px-8">
        {/* Intestazione pagina */}
        <div>
          <h1 className="font-display text-foreground text-[26px] font-semibold tracking-tight">
            Schedine
          </h1>
          <p className="text-muted-foreground mt-1 text-[14px]">
            Le comunicazioni pronte per Alloggiati Web. Verifica i dati e conferma l’invio.
          </p>
        </div>

        {/* Tab + toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="bg-card inline-flex items-center gap-0.5 rounded-lg border border-[var(--brand-hairline)] p-0.5">
            {tabs.map((t) => (
              <button
                key={t.label}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors",
                  t.active
                    ? "text-foreground bg-[var(--brand-avorio)] shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "tabular-nums",
                    t.active ? "text-muted-foreground" : "text-muted-foreground/70",
                  )}
                >
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-card text-muted-foreground flex h-9 w-[220px] items-center gap-2 rounded-lg border border-[var(--brand-hairline)] px-2.5">
              <Search className="size-3.5" />
              <span className="text-[13px]">Cerca ospite o documento…</span>
            </div>
            <button className="bg-card text-muted-foreground hover:text-foreground flex h-9 items-center gap-1.5 rounded-lg border border-[var(--brand-hairline)] px-3 text-[13px] font-medium transition-colors">
              <Filter className="size-3.5" />
              Filtri
            </button>
          </div>
        </div>

        {/* Tabella */}
        <div className="border-border bg-card mt-3 overflow-hidden rounded-xl border shadow-sm">
          {/* Barra azioni di selezione */}
          <div className="bg-primary/[0.05] flex h-12 items-center gap-3 border-b border-[var(--brand-hairline)] px-3">
            <Checkbox indeterminate />
            <span className="text-foreground text-[13px] font-medium">2 selezionate</span>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-8">
                Conferma e invia
              </Button>
              <Button size="sm" variant="outline" className="h-8">
                Esporta CSV
              </Button>
            </div>
            <button className="text-muted-foreground hover:text-foreground ml-auto flex items-center gap-1 text-[12.5px] transition-colors">
              <X className="size-3.5" />
              Deseleziona
            </button>
          </div>

          {/* Intestazione colonne */}
          <div
            className={cn(
              GRID,
              "border-border text-muted-foreground h-10 border-b bg-[var(--brand-avorio)]/50 px-3 text-[11px] font-medium tracking-[0.06em] uppercase",
            )}
          >
            <span className="flex justify-center">
              <Checkbox indeterminate />
            </span>
            <span>Ospite</span>
            <span>Documento</span>
            <span>Struttura</span>
            <span>Arrivo</span>
            <span>Stato</span>
            <span />
          </div>

          {/* Righe */}
          {ROWS.map((r, i) => {
            const selected = SELECTED.has(i);
            return (
              <div
                key={r.docNo}
                className={cn(
                  GRID,
                  "relative h-[52px] border-b border-[var(--brand-hairline)]/60 px-3 transition-colors last:border-0",
                  selected ? "bg-primary/[0.05]" : "hover:bg-[var(--brand-avorio)]/70",
                )}
              >
                {selected && <span className="bg-primary absolute inset-y-0 left-0 w-[2.5px]" />}
                <span className="flex justify-center">
                  <Checkbox checked={selected} />
                </span>

                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-salvia-soft)] text-[11px] font-medium text-[var(--brand-salvia)]">
                    {r.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="text-foreground block truncate text-[13.5px] font-medium">
                      {r.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-[11.5px]">
                      {r.country}
                    </span>
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="text-foreground block text-[12.5px]">{r.docType}</span>
                  <span className="text-muted-foreground block truncate font-mono text-[11.5px]">
                    {r.docNo}
                  </span>
                </div>

                <span className="text-muted-foreground truncate text-[12.5px]">{r.property}</span>

                <div>
                  <span className="text-foreground block font-mono text-[12.5px]">{r.arrival}</span>
                  <span className="text-muted-foreground block text-[11px]">{r.nights}</span>
                </div>

                <StatusBadge status={r.status} />

                <ChevronRight className="text-muted-foreground/40 size-4 justify-self-end" />
              </div>
            );
          })}

          {/* Paginazione */}
          <div className="border-border text-muted-foreground flex h-12 items-center justify-between gap-3 border-t px-3 text-[12.5px]">
            <span>
              <span className="text-foreground tabular-nums">1–8</span> di{" "}
              <span className="tabular-nums">24</span> schedine
            </span>
            <div className="flex items-center gap-1">
              <button className="bg-card text-muted-foreground/50 flex size-7 items-center justify-center rounded-md border border-[var(--brand-hairline)]">
                <ChevronRight className="size-4 rotate-180" />
              </button>
              <button className="bg-card text-muted-foreground hover:text-foreground flex size-7 items-center justify-center rounded-md border border-[var(--brand-hairline)] transition-colors">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
