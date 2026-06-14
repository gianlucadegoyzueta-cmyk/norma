import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import type { SchedinaStatus } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaCredentialRepository, PrismaSchedinaRepository } from "@/server/modules/alloggiati";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { ReopenNeedsReviewButton } from "@/components/reopen-needs-review-button";
import { ReopenRejectedButton } from "@/components/reopen-rejected-button";
import { UnverifiedNote } from "@/components/unverified-note";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isOverdue } from "@/lib/schedina-status";
import { cn } from "@/lib/utils";
import { AutoSendToggle } from "./AutoSendToggle";
import { CredentialOutboxControls } from "./CredentialOutboxControls";
import { mapAlloggiatiError } from "./error-codes";
import { ReconcileControls } from "./ReconcileControls";

export const metadata: Metadata = { title: "Schedine" };
export const dynamic = "force-dynamic";

const dateTimeFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

// Etichetta + classe badge Concierge per ogni stato della schedina.
const STATUS: Record<SchedinaStatus, { text: string; cmx: string }> = {
  PENDING: { text: "Da inviare", cmx: "cmx-badge-wait" },
  SENDING: { text: "In invio", cmx: "cmx-badge-wait" },
  ACQUIRED: { text: "Acquisita", cmx: "cmx-badge-ok" },
  REJECTED: { text: "Respinta", cmx: "cmx-badge-err" },
  UNVERIFIED: { text: "Da verificare", cmx: "cmx-badge-wait" },
  NEEDS_REVIEW: { text: "Da rivedere", cmx: "cmx-badge-wait" },
};

export default async function SchedinePage() {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const orgId = ctx.current.organizationId;
  const [schedine, credentials] = await Promise.all([
    new PrismaSchedinaRepository(prisma).listForOrganization(orgId),
    new PrismaCredentialRepository(prisma).listByOrganization(orgId),
  ]);
  const now = Date.now();

  // Schedine PENDING raggruppate per credenziale: una riga di invio per ciascuna.
  const credStatus = new Map(credentials.map((c) => [c.id, c.status]));
  const pendingByCredential = new Map<string, { label: string; count: number }>();
  const unverifiedByCredential = new Map<string, { label: string; count: number }>();
  for (const s of schedine) {
    if (s.status === "PENDING") {
      const cur = pendingByCredential.get(s.credentialId);
      if (cur) cur.count += 1;
      else pendingByCredential.set(s.credentialId, { label: s.credentialLabel, count: 1 });
    }
    if (s.status === "UNVERIFIED") {
      const cur = unverifiedByCredential.get(s.credentialId);
      if (cur) cur.count += 1;
      else unverifiedByCredential.set(s.credentialId, { label: s.credentialLabel, count: 1 });
    }
  }

  const romeYesterday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() - 86_400_000));

  const counts = schedine.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});
  const overdueCount = schedine.filter((s) => isOverdue(s, now)).length;

  // Mappa schedina REJECTED → stayId per il link "Correggi" (query di pagina, nessun cambio al dominio).
  const rejectedIds = schedine.filter((s) => s.status === "REJECTED").map((s) => s.id);
  const stayIdBySchedina = new Map<string, string>();
  if (rejectedIds.length > 0) {
    const rows = await prisma.schedina.findMany({
      where: { organizationId: orgId, id: { in: rejectedIds } },
      select: { id: true, guest: { select: { stayId: true } } },
    });
    for (const r of rows) stayIdBySchedina.set(r.id, r.guest.stayId);
  }

  return (
    <ConciergePage
      kicker="OUTBOX · ALLOGGIATI WEB"
      title="Schedine"
      intro={
        <>
          L&apos;outbox degli invii ad Alloggiati di{" "}
          <strong style={{ color: "var(--inchiostro)" }}>{ctx.current.organizationName}</strong>.
          Ordinate per scadenza, le più urgenti in cima. L&apos;invio è{" "}
          <strong style={{ color: "var(--inchiostro)" }}>irreversibile</strong>: una schedina
          acquisita non si può cancellare.
        </>
      }
    >
      {schedine.length > 0 && (
        <div className="cmx-section flex flex-wrap gap-2" style={{ marginTop: 0 }}>
          {(Object.keys(STATUS) as SchedinaStatus[])
            .filter((st) => counts[st])
            .map((st) => (
              <span key={st} className={cn("cmx-badge", STATUS[st].cmx)}>
                {counts[st]} {STATUS[st].text.toLowerCase()}
              </span>
            ))}
          {overdueCount > 0 && (
            <span className="cmx-badge cmx-badge-err inline-flex items-center gap-1">
              <AlertTriangle className="size-3" />
              {overdueCount} oltre scadenza
            </span>
          )}
        </div>
      )}

      {pendingByCredential.size > 0 && (
        <section className="cmx-section">
          <Card style={{ borderRadius: 18 }}>
            <CardHeader>
              <CardTitle className="font-display">Da inviare ad Alloggiati</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-sm">
                Verifica con <em>Test</em> (sicuro, ripetibile) e poi invia. L&apos;invio è{" "}
                <strong>irreversibile</strong>.
              </p>
              {[...pendingByCredential.entries()].map(([credId, { label, count }]) => (
                <div key={credId} className="border-border grid gap-2 rounded-xl border p-3">
                  <p className="text-sm font-medium">
                    {label} <span className="text-muted-foreground">· {count} da inviare</span>
                  </p>
                  <CredentialOutboxControls
                    credentialId={credId}
                    pendingCount={count}
                    active={credStatus.get(credId) === "ACTIVE"}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {unverifiedByCredential.size > 0 && (
        <section className="cmx-section">
          <Card style={{ borderRadius: 18 }}>
            <CardHeader>
              <CardTitle className="font-display">Da verificare (esito ignoto)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-sm">
                Dopo un timeout di rete l&apos;invio potrebbe essere andato a buon fine lo stesso.
                Usa la Ricevuta del giorno dell&apos;invio (T+1) per confermare o ri-accodare in
                sicurezza — <strong>mai</strong> re-inviare alla cieca.
              </p>
              {[...unverifiedByCredential.entries()].map(([credId, { label, count }]) => (
                <div key={credId} className="border-border grid gap-2 rounded-xl border p-3">
                  <p className="text-sm font-medium">
                    {label} <span className="text-muted-foreground">· {count} da verificare</span>
                  </p>
                  <ReconcileControls
                    credentialId={credId}
                    unverifiedCount={count}
                    active={credStatus.get(credId) === "ACTIVE"}
                    defaultReceiptDate={romeYesterday}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {credentials.length > 0 && (
        <section className="cmx-section">
          <Card style={{ borderRadius: 18 }}>
            <CardHeader>
              <CardTitle className="font-display">Auto-invio programmato</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-sm">
                Quando attivo per una credenziale, Norma può inviare da sola le schedine già{" "}
                <em>validate dal Test</em>; quelle che il Test boccia restano da rivedere e{" "}
                <strong>non partono mai</strong>. L&apos;invio automatico richiede anche
                l&apos;abilitazione lato server: finché non è attiva, questo interruttore esprime
                solo la tua preferenza.
              </p>
              {credentials.map((c) => (
                <div
                  key={c.id}
                  className="border-border flex items-center justify-between gap-4 rounded-xl border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.label}</p>
                    <p className="text-muted-foreground text-xs">
                      {c.provincia} · {c.status === "ACTIVE" ? "attiva" : "non attiva"}
                    </p>
                  </div>
                  <AutoSendToggle
                    credentialId={c.id}
                    initialEnabled={c.autoSend}
                    active={c.status === "ACTIVE"}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      <section className="cmx-section">
        {schedine.length === 0 ? (
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessuna schedina, per ora</p>
            <p className="cmx-empty-text">
              Quando aggiungi un soggiorno, preparo qui le schedine pronte da confermare. Inizia da
              un{" "}
              <Link href="/stays" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                soggiorno
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {schedine.map((s) => {
              const overdue = isOverdue(s, now);
              return (
                <li key={s.id}>
                  <div
                    className="cmx-row"
                    style={{
                      flexDirection: "column",
                      alignItems: "stretch",
                      ...(overdue ? { borderColor: "rgba(188,75,43,0.45)" } : {}),
                    }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="cmx-row-main">
                        <p className="cmx-row-title truncate">{s.guestName}</p>
                        <p className="cmx-row-meta truncate">
                          {s.propertyName} · {s.credentialLabel}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn("cmx-badge", STATUS[s.status].cmx)}>
                          {STATUS[s.status].text}
                        </span>
                        <span
                          className="text-xs"
                          style={{
                            color: overdue ? "var(--terracotta-dark)" : "var(--soft)",
                            fontWeight: overdue ? 600 : 400,
                          }}
                        >
                          {overdue ? "scaduta " : "entro "}
                          {dateTimeFmt.format(s.deadlineAt)}
                        </span>
                      </div>
                    </div>

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
                          {stayIdBySchedina.get(s.id) ? (
                            <Link href={`/stays/${stayIdBySchedina.get(s.id)}`}>
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
                      <div
                        className="mt-3 border-t pt-3"
                        style={{ borderColor: "var(--hairline)" }}
                      >
                        <UnverifiedNote />
                      </div>
                    )}
                    {s.status === "NEEDS_REVIEW" && (
                      <div
                        className="mt-3 grid gap-1.5 border-t pt-3"
                        style={{ borderColor: "var(--hairline)" }}
                      >
                        <p className="text-xs" style={{ color: "var(--soft)" }}>
                          Tentativi di invio esauriti: controlla i dati della schedina, poi
                          rimettila in coda.
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {stayIdBySchedina.get(s.id) ? (
                            <Link href={`/stays/${stayIdBySchedina.get(s.id)}`}>
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
        )}
      </section>
    </ConciergePage>
  );
}
