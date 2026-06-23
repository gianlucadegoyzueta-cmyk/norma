import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { currentPeriod, loadIstatReport } from "@/server/modules/istat/report";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { IstatExportButton } from "./IstatExportButton";
import { regionMovementForProvincia } from "@/server/modules/istat/regional/routing";
import { loadIstatSubmissionReadiness } from "@/server/modules/istat/submission-readiness-loader";
import type { ReadinessStatus } from "@/server/modules/istat/domain/submission-readiness";
import { Ross1000ExportButton } from "./Ross1000ExportButton";

/**
 * Mappa lo stato di prontezza alla classe badge "cmx" + etichetta IT (presentazionale).
 * Sistema unico con le altre liste (schedine, tassa di soggiorno, billing): vedi
 * `cmx-badge-*` in `concierge-page.css`. READY = verde (ok), gli stati di attesa/azione
 * umana = neutro (wait), così "Pronta" rende identica ovunque.
 */
const READINESS_BADGE: Record<ReadinessStatus, { cmx: string; label: string }> = {
  READY: { cmx: "cmx-badge-ok", label: "Pronta" },
  INCOMPLETE: { cmx: "cmx-badge-wait", label: "Dati mancanti" },
  ASSISTED: { cmx: "cmx-badge-wait", label: "Inserimento manuale" },
  UNROUTED: { cmx: "cmx-badge-wait", label: "Regione da verificare" },
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

  // Ross1000 è per-struttura (a differenza del CSV per-provenienza, che è per-organizzazione).
  const properties = await prisma.property.findMany({
    where: { organizationId: ctx.current.organizationId },
    select: { id: true, name: true, ross1000Code: true, comune: { select: { provincia: true } } },
    orderBy: { name: "asc" },
  });

  // Prontezza all'invio per struttura: prepara il tracciato della regione e dice cosa manca.
  // L'invio reale resta GATED (canale stub): oggi prepari qui e carichi tu il file.
  const readiness = await loadIstatSubmissionReadiness(
    prisma,
    ctx.current.organizationId,
    period,
    properties.map((p) => ({ id: p.id, name: p.name, provincia: p.comune.provincia })),
  );

  // UN blocco unico per struttura: unisce lo STATO (readiness) all'AZIONE reale (file regionale).
  const propById = new Map(properties.map((p) => [p.id, p]));
  const perProperty = readiness.map((pr) => {
    const p = propById.get(pr.propertyId);
    const rm = p ? regionMovementForProvincia(p.comune.provincia) : null;
    const canDownload = rm?.status === "FILE" && rm.serializerId === "ross1000-xml";
    return { pr, ross1000Code: p?.ross1000Code ?? null, canDownload };
  });

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

      {/* Riepilogo di supporto (CSV per provenienza, livello organizzazione): defilato sotto la
          tabella che esporta. Non è il metodo d'invio — quello è per-struttura, qui sotto. */}
      {report.rows.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">
            Riepilogo per provenienza, utile se compili a mano:
          </span>
          <IstatExportButton period={period} disabled={report.rows.length === 0} />
        </div>
      )}

      <p className="text-muted-foreground mt-4 text-xs">
        {guestsConsidered} ospiti considerati nel mese.
        {approximated > 0
          ? ` ${approximated} con provenienza stimata dalla cittadinanza (residenza non indicata): valorizza la residenza nell'ospite per un dato preciso.`
          : ""}
      </p>

      <div className="cmx-section" style={{ marginTop: 32 }}>
        <h2 className="text-sm font-medium">Invio per struttura</h2>
        <p className="text-muted-foreground mt-1 mb-3 text-xs">
          Per ogni struttura: la regione di competenza, lo stato del mese e il file da portare sul
          portale. Dove il portale è integrato scarichi il file Ross1000; altrimenti usi i numeri
          del riepilogo qui sopra e li inserisci a mano. L&rsquo;invio automatico è in arrivo.{" "}
          <strong>Norma prepara, l&rsquo;invio resta una tua decisione.</strong>
        </p>
        {perProperty.length === 0 ? (
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessuna struttura configurata</p>
            <p className="cmx-empty-text">
              Aggiungi una{" "}
              <Link href="/properties" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                struttura
              </Link>{" "}
              per preparare il movimento turistico.
            </p>
          </div>
        ) : (
          <Card style={{ borderRadius: 18 }}>
            <CardContent className="p-0">
              <ul className="divide-border/60 divide-y">
                {perProperty.map(({ pr, ross1000Code, canDownload }) => {
                  const badge = READINESS_BADGE[pr.readiness.status];
                  const region = pr.readiness.region;
                  return (
                    <li
                      key={pr.propertyId}
                      className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">{pr.propertyName}</p>
                          <span className={`cmx-badge ${badge.cmx}`}>{badge.label}</span>
                        </div>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {region
                            ? `${region.label} · ${region.system}`
                            : "Regione non riconosciuta"}
                          {ross1000Code ? ` · codice ${ross1000Code}` : ""}
                        </p>
                        {pr.readiness.status === "INCOMPLETE" &&
                        pr.readiness.missingFields.length > 0 ? (
                          <p className="text-warning-foreground mt-1 text-xs">
                            Mancano: {pr.readiness.missingFields.join(", ")}.
                          </p>
                        ) : null}
                        {pr.readiness.status === "ASSISTED" && region ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Portale {region.system} non ancora integrato: usa i numeri del riepilogo
                            e inseriscili a mano.
                          </p>
                        ) : null}
                        {pr.errored ? (
                          <p className="text-destructive mt-1 text-xs">
                            Dati della struttura/ospiti fuori dai vincoli del tracciato: verificali.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {canDownload ? (
                          <Ross1000ExportButton propertyId={pr.propertyId} period={period} />
                        ) : (
                          <span className="text-muted-foreground max-w-[16rem] text-right text-xs">
                            {region
                              ? `Portale ${region.system}: non integrato. Usa il riepilogo qui sopra e inseriscilo a mano.`
                              : "Comune senza provincia riconosciuta: verifica i dati della struttura."}
                          </span>
                        )}
                      </div>
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
