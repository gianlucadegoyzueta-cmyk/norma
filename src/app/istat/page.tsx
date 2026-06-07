import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { currentPeriod, loadIstatReport } from "@/server/modules/istat/report";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IstatExportButton } from "./IstatExportButton";
import { IstatSubmitButton } from "./IstatSubmitButton";

export const metadata: Metadata = { title: "ISTAT" };
export const dynamic = "force-dynamic";

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default async function IstatPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const period = PERIOD_RE.test(sp.period ?? "")
    ? (sp.period as string)
    : currentPeriod(new Date());
  const { report, approximated, guestsConsidered } = await loadIstatReport(
    ctx.current.organizationId,
    period,
  );
  const submission = await prisma.istatSubmission.findUnique({
    where: { organizationId_period: { organizationId: ctx.current.organizationId, period } },
    select: { submittedAt: true },
  });
  const submittedLabel = submission
    ? new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(submission.submittedAt)
    : null;

  return (
    <div className="min-h-dvh">
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-4xl px-4 py-8 outline-none sm:px-6 sm:py-10"
      >
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            ISTAT — movimento turistico
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Arrivi e presenze del mese per provenienza, pronti da riportare sul portale regionale.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <form method="get" className="flex items-end gap-2">
            <div className="grid gap-1.5">
              <label htmlFor="period" className="text-muted-foreground text-xs font-medium">
                Mese
              </label>
              <Input
                id="period"
                name="period"
                type="month"
                defaultValue={period}
                className="h-9 w-44"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Mostra
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <IstatExportButton period={period} disabled={report.rows.length === 0} />
            <IstatSubmitButton
              period={period}
              submittedLabel={submittedLabel}
              disabled={report.rows.length === 0}
            />
          </div>
        </div>

        {report.rows.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              Nessun movimento turistico per questo mese.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-border text-muted-foreground border-b text-left text-xs">
                    <th scope="col" className="px-4 py-3 font-medium">
                      Provenienza
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Arrivi
                    </th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">
                      Presenze
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((r) => (
                    <tr key={r.label} className="border-border/60 border-b last:border-0">
                      <td className="px-4 py-2.5">{r.label}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.arrivi}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.presenze}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-border border-t font-medium">
                    <td className="px-4 py-3">TOTALE</td>
                    <td className="px-4 py-3 text-right tabular-nums">{report.totals.arrivi}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{report.totals.presenze}</td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        )}

        <p className="text-muted-foreground mt-4 text-xs">
          {guestsConsidered} ospiti considerati nel mese.
          {approximated > 0
            ? ` ${approximated} con provenienza stimata dalla cittadinanza (residenza non indicata): valorizza la residenza nell'ospite per un dato preciso.`
            : ""}
        </p>
      </main>
    </div>
  );
}
