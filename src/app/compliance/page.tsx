import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CircleCheck, CircleSlash, TriangleAlert } from "lucide-react";
import { getCurrentContext } from "@/server/auth/session";
import {
  type ComplianceVerdict,
  type MonthComplianceRow,
  humanMonth,
  loadComplianceHistory,
} from "@/server/modules/compliance";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Storico compliance" };
export const dynamic = "force-dynamic";

const VERDICT: Record<
  ComplianceVerdict,
  { label: string; badgeClass: string; Icon: typeof CircleCheck }
> = {
  regular: { label: "Regolare", badgeClass: "cmx-badge-ok", Icon: CircleCheck },
  attention: { label: "Da sistemare", badgeClass: "cmx-badge-wait", Icon: TriangleAlert },
  quiet: { label: "Nessun movimento", badgeClass: "", Icon: CircleSlash },
};

/**
 * Chip statistico della summary bar: numero grande + etichetta piccola, sobrio e denso.
 * Il colore del numero segue il tono (verde "in regola" salvia · terracotta "pendenze");
 * con zero pendenze il tono resta neutro per non allarmare su un dato a posto.
 */
function SummaryStat({
  value,
  label,
  tone,
}: {
  value: string | number;
  label: string;
  tone: "ok" | "pending";
}) {
  // Token GLOBALI di brand (definiti a :root in globals.css): questa pagina non porta la classe
  // .cmx, quindi NON usare gli alias scoped (--salvia/--soft). salvia-ink è la variante AA per testo.
  const muted = tone === "pending" && Number(value) === 0;
  const color =
    tone === "ok"
      ? "var(--brand-salvia-ink)"
      : muted
        ? "var(--brand-inchiostro-soft)"
        : "var(--brand-terracotta-dark)";
  return (
    <div className="flex min-w-[7.5rem] flex-1 flex-col gap-0.5 rounded-lg px-3 py-2">
      <span
        className="font-display text-2xl leading-none font-semibold tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  );
}

/** Riga di registro: mese, badge di posizione, e il dettaglio a chip separati. */
function MonthRow({ row }: { row: MonthComplianceRow }) {
  const v = VERDICT[row.verdict];
  return (
    <li className="border-border/70 flex items-center justify-between gap-4 border-b py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="font-display text-sm font-medium capitalize">{humanMonth(row.month)}</p>
        <DetailChips row={row} />
      </div>
      <span className={`cmx-badge ${v.badgeClass} inline-flex shrink-0 items-center gap-1`}>
        <v.Icon aria-hidden />
        {v.label}
      </span>
    </li>
  );
}

/**
 * Dettaglio della riga a chip/badge separati (schedine acquisite · da completare · tassa),
 * senza nominativi: solo conteggi. Più leggibile della stringa concatenata, stessi numeri.
 */
function DetailChips({ row }: { row: MonthComplianceRow }) {
  if (row.verdict === "quiet") {
    return (
      <p className="text-muted-foreground mt-0.5 text-xs">
        Nessuna schedina né dichiarazione registrata.
      </p>
    );
  }
  const taxOk = row.taxPending === 0;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {row.schedineExpected > 0 && (
        <span className="cmx-badge cmx-badge-ok">
          {row.schedineAcquired}/{row.schedineExpected} schedine acquisite
        </span>
      )}
      {row.schedineMissing > 0 && (
        <span className="cmx-badge cmx-badge-wait">{row.schedineMissing} da completare</span>
      )}
      {row.taxDeclarations > 0 &&
        (taxOk ? (
          <span className="cmx-badge cmx-badge-ok">tassa dichiarata</span>
        ) : (
          <span className="cmx-badge cmx-badge-wait">
            {row.taxPending} dichiarazione in sospeso
          </span>
        ))}
    </div>
  );
}

export default async function CompliancePage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const rows = await loadComplianceHistory(ctx.current.organizationId, new Date(), 12);
  const tracked = rows.filter((r) => r.verdict !== "quiet");
  const allRegular = tracked.length > 0 && tracked.every((r) => r.verdict === "regular");
  // Riepilogo dai mesi tracciati (gli stessi `rows` della lista): nessun dato nuovo.
  const regularCount = tracked.filter((r) => r.verdict === "regular").length;
  const pendingCount = tracked.filter((r) => r.verdict === "attention").length;

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-4 py-8 outline-none sm:px-6 sm:py-10"
      >
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Storico compliance</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            La tua posizione regolare mese per mese, calcolata dai dati: schedine acquisite rispetto
            alle attese e tasse di soggiorno dichiarate.
          </p>
        </div>

        {tracked.length > 0 && (
          <div className="border-border/70 bg-card mb-4 flex flex-wrap items-stretch gap-3 rounded-xl border p-1">
            <SummaryStat value={`${regularCount}/12`} label="mesi in regola" tone="ok" />
            <SummaryStat
              value={pendingCount}
              label={pendingCount === 1 ? "mese con pendenze" : "mesi con pendenze"}
              tone="pending"
            />
          </div>
        )}

        {tracked.length > 0 && (
          <p className="text-muted-foreground mb-4 text-sm">
            {allRegular
              ? "Tutti i mesi con movimento risultano in regola. Bel lavoro."
              : "Alcuni mesi hanno pendenze da chiudere: li trovi segnati qui sotto."}
          </p>
        )}

        <Card>
          <CardContent className="py-2">
            {rows.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Ancora nessun dato di compliance.
              </p>
            ) : (
              <ul>
                {rows.map((row) => (
                  <MonthRow key={row.month} row={row} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-muted-foreground mt-4 text-xs">
          «Regolare» significa che tutte le schedine dovute per gli arrivi del mese risultano
          acquisite dalla Questura e che nessuna dichiarazione di tassa è rimasta in lavorazione.
        </p>
      </main>
    </div>
  );
}
