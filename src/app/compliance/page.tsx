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

/** Riga di registro: mese, badge di posizione, e il dettaglio in parole sobrie. */
function MonthRow({ row }: { row: MonthComplianceRow }) {
  const v = VERDICT[row.verdict];
  return (
    <li className="border-border/70 flex items-center justify-between gap-4 border-b py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="font-display text-sm font-medium capitalize">{humanMonth(row.month)}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{detail(row)}</p>
      </div>
      <span className={`cmx-badge ${v.badgeClass} inline-flex shrink-0 items-center gap-1`}>
        <v.Icon aria-hidden />
        {v.label}
      </span>
    </li>
  );
}

/** Dettaglio leggibile della riga, senza nominativi (solo conteggi). */
function detail(row: MonthComplianceRow): string {
  if (row.verdict === "quiet") return "Nessuna schedina né dichiarazione registrata.";
  const bits: string[] = [];
  if (row.schedineExpected > 0) {
    bits.push(`${row.schedineAcquired}/${row.schedineExpected} schedine acquisite`);
  }
  if (row.schedineMissing > 0) {
    bits.push(`${row.schedineMissing} da completare`);
  }
  if (row.taxDeclarations > 0) {
    const taxOk = row.taxPending === 0;
    bits.push(taxOk ? "tassa dichiarata" : `${row.taxPending} dichiarazione in sospeso`);
  }
  return bits.join(" · ");
}

export default async function CompliancePage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const rows = await loadComplianceHistory(ctx.current.organizationId, new Date(), 12);
  const tracked = rows.filter((r) => r.verdict !== "quiet");
  const allRegular = tracked.length > 0 && tracked.every((r) => r.verdict === "regular");

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
