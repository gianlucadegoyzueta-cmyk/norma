import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { currentPeriod, loadIstatReport } from "@/server/modules/istat/report";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IstatExportButton } from "./IstatExportButton";
import { IstatSubmitButton } from "./IstatSubmitButton";
import { Ross1000ExportButton } from "./Ross1000ExportButton";

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

  // Ross1000 è per-struttura (a differenza del CSV per-provenienza, che è per-organizzazione).
  const properties = await prisma.property.findMany({
    where: { organizationId: ctx.current.organizationId },
    select: { id: true, name: true, ross1000Code: true },
    orderBy: { name: "asc" },
  });

  return (
    <ConciergePage
      kicker="STATISTICA · MOVIMENTO TURISTICO"
      title="ISTAT"
      intro="Arrivi e presenze del mese per provenienza, pronti da riportare sul portale regionale."
    >
      <div
        className="cmx-section flex flex-wrap items-end justify-between gap-3"
        style={{ marginTop: 0 }}
      >
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

      <div className="cmx-section" style={{ marginTop: 24 }}>
        {report.rows.length === 0 ? (
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessun movimento turistico</p>
            <p className="cmx-empty-text">Per questo mese non risultano arrivi né presenze.</p>
          </div>
        ) : (
          <Card style={{ borderRadius: 18 }}>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Movimento turistico ISTAT del mese {period}: arrivi e presenze per provenienza.
                </caption>
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
      </div>

      <p className="text-muted-foreground mt-4 text-xs">
        {guestsConsidered} ospiti considerati nel mese.
        {approximated > 0
          ? ` ${approximated} con provenienza stimata dalla cittadinanza (residenza non indicata): valorizza la residenza nell'ospite per un dato preciso.`
          : ""}
      </p>

      <div className="cmx-section" style={{ marginTop: 32 }}>
        <h2 className="text-sm font-medium">Ross1000 — file XML per struttura</h2>
        <p className="text-muted-foreground mt-1 mb-3 text-xs">
          Movimento turistico in formato Ross1000 (Lazio e altre ~13 regioni). Scarica il file .xml
          di ogni struttura e caricalo sul portale regionale. Se mancano dati obbligatori il file
          non viene generato: completa prima i dati indicati (mai inviamo dati inventati).
        </p>
        {properties.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nessuna struttura configurata.</p>
        ) : (
          <Card style={{ borderRadius: 18 }}>
            <CardContent className="p-0">
              <ul className="divide-border/60 divide-y">
                {properties.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {p.ross1000Code
                          ? `codice struttura: ${p.ross1000Code}`
                          : "codice struttura non configurato"}
                      </p>
                    </div>
                    <Ross1000ExportButton propertyId={p.id} period={period} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </ConciergePage>
  );
}
