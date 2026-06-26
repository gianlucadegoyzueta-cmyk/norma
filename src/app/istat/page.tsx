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
import {
  PROPERTY_CONFIG_FIELDS,
  type MissingDetail,
  type ReadinessStatus,
} from "@/server/modules/istat/domain/submission-readiness";
import { RegionFileExportButton } from "./RegionFileExportButton";

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

/**
 * Raggruppa i dati mancanti (INCOMPLETE) per DOVE si correggono, così ogni gruppo può avere il suo
 * deep-link: config struttura (codice/camere/letti → `/properties/[id]#ricettiva`), dato ospite
 * (→ `/stays/[stayId]#ospite-[guestId]`), dato di un soggiorno (es. partenza → `/stays/[stayId]`).
 * `scope` da solo non basta: un campo STRUTTURA con refId è di un soggiorno, non della config.
 */
type IstatBuckets = {
  struttura: string[];
  perGuest: { guestId: string; stayId: string | null; labels: string[] }[];
  perStay: { stayId: string; labels: string[] }[];
};

function bucketMissingDetail(
  detail: readonly MissingDetail[],
  stayIdByGuest: Map<string, string>,
): IstatBuckets {
  const struttura: string[] = [];
  const perGuest = new Map<string, { stayId: string | null; labels: string[] }>();
  const perStay = new Map<string, string[]>();
  for (const m of detail) {
    if (PROPERTY_CONFIG_FIELDS.has(m.field)) {
      struttura.push(m.label);
    } else if (m.scope === "GUEST" && m.refId) {
      const cur = perGuest.get(m.refId) ?? {
        stayId: stayIdByGuest.get(m.refId) ?? null,
        labels: [],
      };
      cur.labels.push(m.label);
      perGuest.set(m.refId, cur);
    } else if (m.refId) {
      // STRUTTURA con refId = stayId (es. data di partenza): dato del soggiorno, non della config.
      const cur = perStay.get(m.refId) ?? [];
      cur.push(m.label);
      perStay.set(m.refId, cur);
    } else {
      struttura.push(m.label);
    }
  }
  return {
    struttura: [...new Set(struttura)],
    perGuest: [...perGuest.entries()].map(([guestId, v]) => ({ guestId, ...v })),
    perStay: [...perStay.entries()].map(([stayId, labels]) => ({ stayId, labels })),
  };
}

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
    // Scaricabile = qualsiasi regione a FILE con un serializer (Ross1000, SPOT/Puglia, Turismatica/Umbria).
    const canDownload = rm?.status === "FILE" && rm.serializerId !== null;
    return {
      pr,
      ross1000Code: p?.ross1000Code ?? null,
      canDownload,
      serializerId: rm?.serializerId ?? null,
      system: rm?.system ?? null,
    };
  });

  // Riepilogo leggero sempre in testa (no salti di layout): tre numeri del mese selezionato da
  // dati già caricati — arrivi, presenze e quante strutture sono pronte all'invio.
  const readyCount = perProperty.filter((x) => x.pr.readiness.status === "READY").length;

  // Deep-link dei dati OSPITE mancanti all'ospite esatto: raccogli i guestId (refId scope GUEST)
  // dalle readiness INCOMPLETE e risolvi lo stayId (come `stayIdBySchedina` in /schedine). Query di
  // pagina, nessun cambio al dominio.
  const guestRefIds = [
    ...new Set(
      perProperty.flatMap((x) =>
        x.pr.readiness.missingDetail
          .filter((m) => m.scope === "GUEST" && m.refId)
          .map((m) => m.refId as string),
      ),
    ),
  ];
  const stayIdByGuest = new Map<string, string>();
  if (guestRefIds.length > 0) {
    const rows = await prisma.guest.findMany({
      where: { organizationId: ctx.current.organizationId, id: { in: guestRefIds } },
      select: { id: true, stayId: true },
    });
    for (const g of rows) stayIdByGuest.set(g.id, g.stayId);
  }
  const bucketsByProperty = new Map<string, IstatBuckets>();
  for (const x of perProperty) {
    if (x.pr.readiness.status === "INCOMPLETE" && x.pr.readiness.missingDetail.length > 0) {
      bucketsByProperty.set(
        x.pr.propertyId,
        bucketMissingDetail(x.pr.readiness.missingDetail, stayIdByGuest),
      );
    }
  }

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

        {/* Riepilogo del mese: tre numeri sobri da dati già caricati, sempre presenti (anche a 0). */}
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {(
            [
              { label: "arrivi", value: report.totals.arrivi },
              { label: "presenze", value: report.totals.presenze },
              { label: "strutture pronte", value: readyCount },
            ] as const
          ).map((stat) => (
            <div key={stat.label} className="flex flex-col leading-tight">
              <span className="text-foreground text-lg font-semibold tabular-nums">
                {stat.value}
              </span>
              <span className="text-muted-foreground text-[11px] tracking-[0.04em] uppercase">
                {stat.label}
              </span>
            </div>
          ))}
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
          portale. Dove Norma genera il tracciato (Ross1000, SPOT/Puglia, Turismatica/Umbria)
          scarichi il file della tua regione; altrimenti usi i numeri del riepilogo qui sopra e li
          inserisci a mano. L&rsquo;invio automatico è in arrivo.{" "}
          <strong>
            Con mandato attivo, Norma invia per tuo conto; altrimenti scarichi e invii tu.
          </strong>
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
                {perProperty.map(({ pr, ross1000Code, canDownload, serializerId, system }) => {
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
                        {(() => {
                          // Dati mancanti raggruppati per dove si correggono, ognuno col suo deep-link.
                          const b = bucketsByProperty.get(pr.propertyId);
                          if (!b) return null;
                          return (
                            <div className="mt-1 grid gap-1">
                              {b.struttura.length > 0 ? (
                                <p className="text-warning-foreground text-xs">
                                  Dati struttura mancanti: {b.struttura.join(", ")}.{" "}
                                  <Link
                                    href={`/properties/${pr.propertyId}#ricettiva`}
                                    className="font-medium underline underline-offset-2"
                                  >
                                    Completa la struttura →
                                  </Link>
                                </p>
                              ) : null}
                              {b.perGuest.map((g) => (
                                <p key={g.guestId} className="text-warning-foreground text-xs">
                                  Dati ospite mancanti: {g.labels.join(", ")}.{" "}
                                  {g.stayId ? (
                                    <Link
                                      href={`/stays/${g.stayId}#ospite-${g.guestId}`}
                                      className="font-medium underline underline-offset-2"
                                    >
                                      Completa l&rsquo;ospite →
                                    </Link>
                                  ) : null}
                                </p>
                              ))}
                              {b.perStay.map((s) => (
                                <p key={s.stayId} className="text-warning-foreground text-xs">
                                  Dati soggiorno mancanti: {s.labels.join(", ")}.{" "}
                                  <Link
                                    href={`/stays/${s.stayId}`}
                                    className="font-medium underline underline-offset-2"
                                  >
                                    Apri il soggiorno →
                                  </Link>
                                </p>
                              ))}
                            </div>
                          );
                        })()}
                        {pr.readiness.status === "ASSISTED" && region ? (
                          <p className="text-muted-foreground mt-1 text-xs">
                            Portale {region.system} non ancora integrato: usa i numeri del riepilogo
                            e inseriscili a mano.
                          </p>
                        ) : null}
                        {pr.readiness.status === "UNROUTED" ? (
                          <p className="text-warning-foreground mt-1 text-xs">
                            Provincia non riconosciuta dal routing regionale: verifica il Comune
                            della struttura.
                          </p>
                        ) : null}
                        {pr.errored ? (
                          <p className="text-destructive mt-1 text-xs">
                            Dati della struttura/ospiti fuori dai vincoli del tracciato: verificali.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {canDownload && serializerId ? (
                          <RegionFileExportButton
                            propertyId={pr.propertyId}
                            period={period}
                            serializerId={serializerId}
                            system={system ?? ""}
                          />
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
