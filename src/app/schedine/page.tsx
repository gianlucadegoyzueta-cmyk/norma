import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import type { SchedinaStatus } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaCredentialRepository, PrismaSchedinaRepository } from "@/server/modules/alloggiati";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isOverdue } from "@/lib/schedina-status";
import { schedinaStatusDisplay } from "@/lib/schedina-status-display";
import { cn } from "@/lib/utils";
import { AutoSendToggle } from "./AutoSendToggle";
import { CredentialOutboxControls } from "./CredentialOutboxControls";
import { ReconcileControls } from "./ReconcileControls";
import { SchedineList } from "./schedine-list";

export const metadata: Metadata = { title: "Schedine" };
export const dynamic = "force-dynamic";

// Priorità d'azione della lista: ciò che richiede l'host in cima, l'acquisito (fatto) in fondo.
const STATUS_PRIORITY: SchedinaStatus[] = [
  "REJECTED",
  "NEEDS_REVIEW",
  "PENDING",
  "UNVERIFIED",
  "SENDING",
  "ACQUIRED",
];

// L'ordine dei chip di riepilogo in testa (etichetta + classe badge dal display condiviso #111).
const SUMMARY_ORDER: SchedinaStatus[] = [
  "PENDING",
  "SENDING",
  "ACQUIRED",
  "REJECTED",
  "UNVERIFIED",
  "NEEDS_REVIEW",
];

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

  // Riepilogo leggero sempre in testa (no salti di layout negli stati parziali): tre numeri
  // chiave già disponibili — in coda, acquisite, credenziali attive. Tutto da dati esistenti.
  const queuedCount = counts.PENDING ?? 0;
  const acquiredCount = counts.ACQUIRED ?? 0;
  const activeCredentials = credentials.filter((c) => c.status === "ACTIVE").length;

  // Ordine d'azione della lista: stato per priorità, poi overdue, poi scadenza (l'intro lo promette).
  const sortedSchedine = [...schedine].sort((a, b) => {
    const ra = STATUS_PRIORITY.indexOf(a.status);
    const rb = STATUS_PRIORITY.indexOf(b.status);
    if (ra !== rb) return ra - rb;
    const oa = isOverdue(a, now) ? 0 : 1;
    const ob = isOverdue(b, now) ? 0 : 1;
    if (oa !== ob) return oa - ob;
    return a.deadlineAt.getTime() - b.deadlineAt.getTime();
  });

  // Mappa schedina REJECTED/NEEDS_REVIEW → soggiorno e ospite, per i link "Correggi" / "Apri
  // soggiorno" (deep-link all'OSPITE esatto). Query di pagina, nessun cambio al dominio.
  // NB: include anche NEEDS_REVIEW (prima la mappa era solo REJECTED → il link "Apri soggiorno"
  // di NEEDS_REVIEW non compariva mai).
  const actionableIds = schedine
    .filter((s) => s.status === "REJECTED" || s.status === "NEEDS_REVIEW")
    .map((s) => s.id);
  const stayIdBySchedina = new Map<string, string>();
  const guestIdBySchedina = new Map<string, string>();
  if (actionableIds.length > 0) {
    const rows = await prisma.schedina.findMany({
      where: { organizationId: orgId, id: { in: actionableIds } },
      select: { id: true, guestId: true, guest: { select: { stayId: true } } },
    });
    for (const r of rows) {
      stayIdBySchedina.set(r.id, r.guest.stayId);
      guestIdBySchedina.set(r.id, r.guestId);
    }
  }

  return (
    <ConciergePage
      dense
      active="schedine"
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
      {/* Riepilogo sempre presente: niente salti di layout quando la coda è vuota o parziale.
          Tre numeri sobri da dati già caricati (PENDING, ACQUIRED, credenziali ATTIVE). */}
      <div className="cmx-section flex flex-wrap gap-x-6 gap-y-2" style={{ marginTop: 0 }}>
        {(
          [
            { label: "in coda", value: queuedCount },
            { label: "acquisite", value: acquiredCount },
            { label: "credenziali attive", value: activeCredentials },
          ] as const
        ).map((stat) => (
          <div key={stat.label} className="flex flex-col leading-tight">
            <span className="text-foreground text-lg font-semibold tabular-nums">{stat.value}</span>
            <span className="text-muted-foreground text-[11px] tracking-[0.04em] uppercase">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {schedine.length > 0 && (
        <div className="cmx-section flex flex-wrap gap-2" style={{ marginTop: 0 }}>
          {/* Urgenza in testa (#105), poi i conteggi per stato dal display unico (#111). */}
          {overdueCount > 0 && (
            <span className="cmx-badge cmx-badge-err inline-flex items-center gap-1">
              <AlertTriangle className="size-3" />
              {overdueCount} oltre scadenza
            </span>
          )}
          {SUMMARY_ORDER.filter((st) => counts[st]).map((st) => {
            const d = schedinaStatusDisplay(st);
            return (
              <span key={st} className={cn("cmx-badge", d.badgeClass)}>
                {counts[st]} {d.label.toLowerCase()}
              </span>
            );
          })}
        </div>
      )}

      {/* Onboarding guidato quando manca il primo passo: senza credenziali non nasce alcuna
          schedina, quindi indirizziamo subito l'host invece di mostrargli liste vuote. */}
      {credentials.length === 0 && (
        <section className="cmx-section">
          <Card style={{ borderRadius: 18 }}>
            <CardHeader>
              <CardTitle>Inizia qui</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-muted-foreground text-sm">
                Le schedine partono dalle credenziali Alloggiati: collega quelle della tua struttura
                e Norma prepara qui gli invii alla Polizia di Stato, pronti da confermare. È il
                primo dei tre passi —{" "}
                <Link href="/credentials" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                  Credenziali
                </Link>{" "}
                ·{" "}
                <Link href="/properties" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                  Immobile
                </Link>{" "}
                ·{" "}
                <Link href="/stays" style={{ color: "var(--terracotta)", fontWeight: 600 }}>
                  Soggiorno
                </Link>
                .
              </p>
              <div>
                <Link href="/credentials">
                  <Button size="sm">Aggiungi una credenziale</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* "Da inviare ad Alloggiati" resta sempre visibile (anche a coda vuota) per evitare che la
          sezione sparisca: con credenziali ma senza PENDING mostriamo un placeholder sobrio. */}
      {credentials.length > 0 && (
        <section className="cmx-section">
          <Card style={{ borderRadius: 18 }}>
            <CardHeader>
              <CardTitle>Da inviare ad Alloggiati</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-sm">
                Verifica con <em>Test</em> (sicuro, ripetibile) e poi invia. L&apos;invio è{" "}
                <strong>irreversibile</strong>.
              </p>
              {pendingByCredential.size === 0 ? (
                <div className="border-border text-muted-foreground rounded-xl border border-dashed p-3 text-sm">
                  Nessuna schedina in coda. Le nuove schedine compaiono qui appena pronte
                  dall&apos;invio.
                </div>
              ) : (
                [...pendingByCredential.entries()].map(([credId, { label, count }]) => (
                  <div key={credId} className="border-border grid gap-2 rounded-xl border p-3">
                    <p className="text-sm font-medium">
                      {label} <span className="text-muted-foreground">· {count} da inviare</span>
                    </p>
                    <CredentialOutboxControls
                      credentialId={credId}
                      pendingCount={count}
                      status={credStatus.get(credId) ?? "PENDING_REONBOARDING"}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      )}

      {unverifiedByCredential.size > 0 && (
        <section className="cmx-section">
          <Card style={{ borderRadius: 18 }}>
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
              <CardTitle>Auto-invio programmato</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <p className="text-muted-foreground text-sm">
                Con l&apos;auto-invio attivo per una credenziale, le schedine già{" "}
                <em>validate dal Test</em> vengono inviate automaticamente all&apos;orario
                programmato, su tuo mandato; quelle che il Test boccia restano da rivedere e{" "}
                <strong>non partono mai</strong>. Richiede anche l&apos;abilitazione lato server:
                finché non è attiva, questo interruttore esprime solo la tua preferenza.
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
                    label={c.label}
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
        <SchedineList
          schedine={sortedSchedine}
          stayIdBySchedina={stayIdBySchedina}
          guestIdBySchedina={guestIdBySchedina}
          now={now}
        />
      </section>
    </ConciergePage>
  );
}
