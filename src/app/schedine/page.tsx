import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, FileText } from "lucide-react";
import type { SchedinaStatus } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import {
  PrismaCredentialRepository,
  PrismaSchedinaRepository,
  type SchedinaListItem,
} from "@/server/modules/alloggiati";
import { SiteHeader } from "@/components/site-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CredentialOutboxControls } from "./CredentialOutboxControls";
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

const STATUS: Record<SchedinaStatus, { text: string; variant: BadgeProps["variant"] }> = {
  PENDING: { text: "Da inviare", variant: "secondary" },
  SENDING: { text: "In invio", variant: "secondary" },
  ACQUIRED: { text: "Acquisita", variant: "success" },
  REJECTED: { text: "Respinta", variant: "destructive" },
  UNVERIFIED: { text: "Da verificare", variant: "warning" },
};

/** Una schedina ancora "aperta" (non acquisita) la cui deadline è passata è in ritardo. */
function isOverdue(s: SchedinaListItem, now: number): boolean {
  const open = s.status === "PENDING" || s.status === "SENDING" || s.status === "UNVERIFIED";
  return open && s.deadlineAt.getTime() < now;
}

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

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Schedine</h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            L&apos;outbox degli invii ad Alloggiati di{" "}
            <strong className="text-foreground">{ctx.current.organizationName}</strong>. Ordinate
            per scadenza (le più urgenti in cima). L&apos;invio è <strong>irreversibile</strong>:
            una schedina acquisita non si può cancellare.
          </p>
        </div>

        {schedine.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {(Object.keys(STATUS) as SchedinaStatus[])
              .filter((st) => counts[st])
              .map((st) => (
                <Badge key={st} variant={STATUS[st].variant}>
                  {counts[st]} {STATUS[st].text.toLowerCase()}
                </Badge>
              ))}
            {overdueCount > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="size-3" />
                {overdueCount} oltre scadenza
              </Badge>
            )}
          </div>
        )}

        {pendingByCredential.size > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Da inviare ad Alloggiati</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-sm">
                Verifica con <em>Test</em> (sicuro, ripetibile) e poi invia. L&apos;invio è{" "}
                <strong>irreversibile</strong>.
              </p>
              {[...pendingByCredential.entries()].map(([credId, { label, count }]) => (
                <div key={credId} className="border-border grid gap-2 rounded-md border p-3">
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
        )}

        {unverifiedByCredential.size > 0 && (
          <Card className="mb-6 border-warning/40">
            <CardHeader>
              <CardTitle>Da verificare (esito ignoto)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-sm">
                Dopo un timeout di rete l&apos;invio potrebbe essere andato a buon fine lo stesso.
                Usa la Ricevuta del giorno dell&apos;invio (T+1) per confermare o ri-accodare in
                sicurezza — <strong>mai</strong> re-inviare alla cieca.
              </p>
              {[...unverifiedByCredential.entries()].map(([credId, { label, count }]) => (
                <div key={credId} className="border-border grid gap-2 rounded-md border p-3">
                  <p className="text-sm font-medium">
                    {label}{" "}
                    <span className="text-muted-foreground">· {count} da verificare</span>
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
        )}

        {schedine.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <span className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-lg">
                <FileText className="size-5" />
              </span>
              <p className="text-muted-foreground text-sm">
                Nessuna schedina ancora. Generale da un{" "}
                <Link href="/stays" className="text-foreground font-medium underline">
                  soggiorno
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-2">
            {schedine.map((s) => {
              const overdue = isOverdue(s, now);
              return (
                <li key={s.id}>
                  <Card className={cn(overdue && "border-destructive/50")}>
                    <CardContent className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.guestName}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {s.propertyName} · {s.credentialLabel}
                        </p>
                        {s.status === "REJECTED" && s.lastErrorDes && (
                          <p className="text-destructive mt-0.5 truncate text-xs">
                            {s.lastErrorCod ? `[${s.lastErrorCod}] ` : ""}
                            {s.lastErrorDes}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <Badge variant={STATUS[s.status].variant}>{STATUS[s.status].text}</Badge>
                        <span
                          className={cn(
                            "text-xs",
                            overdue ? "text-destructive font-medium" : "text-muted-foreground",
                          )}
                        >
                          {overdue ? "scaduta " : "entro "}
                          {dateTimeFmt.format(s.deadlineAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
