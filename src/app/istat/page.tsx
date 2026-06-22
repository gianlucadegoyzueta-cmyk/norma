import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { currentPeriod, loadIstatReport } from "@/server/modules/istat/report";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IstatExportButton } from "./IstatExportButton";
import { IstatSubmitButton } from "./IstatSubmitButton";
import { IstatAutoSubmitButton } from "./IstatAutoSubmitButton";
import { regionMovementForProvincia } from "@/server/modules/istat/regional/routing";
import { loadIstatSubmissionReadiness } from "@/server/modules/istat/submission-readiness-loader";
import type { ReadinessStatus } from "@/server/modules/istat/domain/submission-readiness";
import { Ross1000ExportButton } from "./Ross1000ExportButton";

/** Mappa lo stato di prontezza al variant del Badge + etichetta IT (presentazionale). */
const READINESS_BADGE: Record<
  ReadinessStatus,
  { variant: "success" | "warning" | "secondary"; label: string }
> = {
  READY: { variant: "success", label: "Pronta" },
  INCOMPLETE: { variant: "warning", label: "Dati mancanti" },
  ASSISTED: { variant: "secondary", label: "Inserimento manuale" },
  UNROUTED: { variant: "secondary", label: "Regione da verificare" },
};

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
    select: { submittedAt: true, arriviTotal: true, presenzeTotal: true },
  });
  const submittedLabel = submission
    ? new Intl.DateTimeFormat("it-IT", { dateStyle: "medium" }).format(submission.submittedAt)
    : null;
  // Staleness: il report live diverge dallo snapshot salvato all'invio? (ospite cambiato dopo)
  const submissionStale = submission
    ? submission.arriviTotal !== report.totals.arrivi ||
      submission.presenzeTotal !== report.totals.presenze
    : false;

  // Ross1000 è per-struttura (a differenza del CSV per-provenienza, che è per-organizzazione).
  const properties = await prisma.property.findMany({
    where: { organizationId: ctx.current.organizationId },
    select: { id: true, name: true, ross1000Code: true, comune: { select: { provincia: true } } },
    orderBy: { name: "asc" },
  });

  // Prontezza all'invio per struttura: prepara il tracciato della regione e dice cosa manca.
  // L'invio reale resta GATED (canale stub) → l'affordance "Invia" è sempre disabilitata.
  const readiness = await loadIstatSubmissionReadiness(
    prisma,
    ctx.current.organizationId,
    period,
    properties.map((p) => ({ id: p.id, name: p.name, provincia: p.comune.provincia })),
  );

  return (
    <ConciergePage
      dense
      active="istat"
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
            stale={submissionStale}
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
        <h2 className="text-sm font-medium">Prontezza all&rsquo;invio per struttura</h2>
        <p className="text-muted-foreground mt-1 mb-3 text-xs">
          Per ogni struttura: la regione di competenza, se il movimento del mese è completo e cosa
          eventualmente manca. L&rsquo;invio automatico al portale è in arrivo: oggi prepari qui e
          carichi tu il file. <strong>Norma prepara, l&rsquo;invio resta una tua decisione.</strong>
        </p>
        {readiness.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nessuna struttura configurata.</p>
        ) : (
          <Card style={{ borderRadius: 18 }}>
            <CardContent className="p-0">
              <ul className="divide-border/60 divide-y">
                {readiness.map((pr) => {
                  const badge = READINESS_BADGE[pr.readiness.status];
                  const region = pr.readiness.region;
                  const hintId = `auto-submit-hint-${pr.propertyId}`;
                  return (
                    <li
                      key={pr.propertyId}
                      className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{pr.propertyName}</p>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {region
                            ? `${region.label} · ${region.system}`
                            : "Regione non riconosciuta"}
                        </p>
                        {pr.readiness.status === "INCOMPLETE" &&
                        pr.readiness.missingFields.length > 0 ? (
                          <p className="text-warning-foreground dark:text-warning mt-1 text-xs">
                            Mancano: {pr.readiness.missingFields.join(", ")}.
                          </p>
                        ) : null}
                        {pr.readiness.status === "ASSISTED" && region ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Portale {region.system} non ancora integrato: usa i numeri del report e
                            inseriscili a mano.
                          </p>
                        ) : null}
                        {pr.errored ? (
                          <p className="text-destructive mt-1 text-xs">
                            Dati della struttura/ospiti fuori dai vincoli del tracciato: verificali.
                          </p>
                        ) : null}
                      </div>
                      {pr.readiness.serializerId ? (
                        <IstatAutoSubmitButton
                          ready={pr.readiness.status === "READY"}
                          hintId={hintId}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

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
                {properties.map((p) => {
                  const rm = regionMovementForProvincia(p.comune.provincia);
                  const canDownload = rm?.status === "FILE" && rm.serializerId === "ross1000-xml";
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {rm ? `${rm.label} · ${rm.system}` : "Regione non riconosciuta"}
                          {p.ross1000Code ? ` · codice ${p.ross1000Code}` : ""}
                        </p>
                      </div>
                      {canDownload ? (
                        <Ross1000ExportButton propertyId={p.id} period={period} />
                      ) : (
                        <span className="text-muted-foreground max-w-[16rem] text-right text-xs">
                          {rm
                            ? `Portale ${rm.system}: non integrato. Usa i numeri del report qui sopra e inseriscili a mano.`
                            : "Comune senza provincia riconosciuta: verifica i dati della struttura."}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </ConciergePage>
  );
}
