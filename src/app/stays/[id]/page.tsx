import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, User, Users } from "lucide-react";
import type { TipoAlloggiato } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import {
  PrismaReferenceTableRepository,
  PrismaReferenceTablesLoader,
  PrismaSchedinaRepository,
  checkReferenceTablesHealth,
} from "@/server/modules/alloggiati";
import { PrismaStaysRepository, StaysService } from "@/server/modules/stays";
import { SiteHeader } from "@/components/site-header";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateSchedineButton } from "./GenerateSchedineButton";
import { GuestPartyForm } from "./GuestPartyForm";

export const metadata: Metadata = { title: "Soggiorno" };
export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Rome",
});

const TIPO_LABEL: Record<TipoAlloggiato, string> = {
  OSPITE_SINGOLO: "Ospite singolo",
  CAPO_FAMIGLIA: "Capo famiglia",
  CAPO_GRUPPO: "Capo gruppo",
  FAMILIARE: "Familiare",
  MEMBRO_GRUPPO: "Membro gruppo",
};

const SCHEDINA_BADGE: Record<string, { text: string; variant: BadgeProps["variant"] }> = {
  PENDING: { text: "Da inviare", variant: "secondary" },
  SENDING: { text: "In invio", variant: "secondary" },
  ACQUIRED: { text: "Acquisita", variant: "success" },
  REJECTED: { text: "Respinta", variant: "destructive" },
  UNVERIFIED: { text: "Da verificare", variant: "warning" },
};

export default async function StayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const orgId = ctx.current.organizationId;

  const staysService = new StaysService(
    new PrismaStaysRepository(prisma),
    new PrismaSchedinaRepository(prisma),
    new PrismaReferenceTablesLoader(prisma),
  );

  const stay = await staysService.getStayDetail(id, orgId);
  if (!stay) notFound();

  const [health, countries, comuni, documentTypes] = await Promise.all([
    checkReferenceTablesHealth(new PrismaReferenceTableRepository(prisma)),
    prisma.country.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.comune.findMany({
      select: { id: true, name: true, provincia: true },
      orderBy: { name: "asc" },
    }),
    prisma.documentType.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // Capi/singoli (leaderId null) e relativi membri.
  const leaders = stay.guests.filter((g) => g.leaderId === null);
  const membersOf = (leaderId: string) => stay.guests.filter((g) => g.leaderId === leaderId);

  // Motivo per cui la generazione è bloccata (priorità: credenziale → ospiti → tabelle).
  let generateDisabledReason: string | undefined;
  if (!stay.hasCredential) {
    generateDisabledReason = "Collega l'immobile a una credenziale Alloggiati.";
  } else if (stay.guests.length === 0) {
    generateDisabledReason = "Aggiungi almeno un ospite.";
  } else if (!health.ready) {
    generateDisabledReason = "Sincronizza prima le tabelle di riferimento Alloggiati.";
  }

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/stays"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Soggiorni
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">{stay.propertyName}</h1>
          <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-4" />
              {dateFmt.format(stay.arrivalDate)}
              {stay.departureDate ? ` → ${dateFmt.format(stay.departureDate)}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" />
              {stay.guests.length}/{stay.guestsCount} ospiti
            </span>
            <span>
              {stay.comuneName} ({stay.provincia})
            </span>
            {stay.isShortStay && <span>· breve (≤24h)</span>}
          </p>
        </div>

        {/* Ospiti già inseriti */}
        <section className="mb-8">
          <h2 className="text-muted-foreground mb-3 text-sm font-medium">Ospiti</h2>
          {stay.guests.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground py-8 text-center text-sm">
                Nessun ospite ancora. Aggiungili qui sotto.
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-2">
              {leaders.map((leader) => {
                const members = membersOf(leader.id);
                return (
                  <li key={leader.id}>
                    <Card>
                      <CardContent className="grid gap-2 px-4 py-3">
                        <GuestRow guest={leader} />
                        {members.map((m) => (
                          <div key={m.id} className="border-border/60 border-l-2 pl-3">
                            <GuestRow guest={m} nested />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Generazione schedine */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Genera schedine</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <p className="text-muted-foreground text-sm">
                Crea una schedina PENDING per ogni ospite (idempotente: nessun doppione).
                L&apos;invio ad Alloggiati avviene poi dall&apos;outbox.
              </p>
              <GenerateSchedineButton
                stayId={stay.id}
                disabled={Boolean(generateDisabledReason)}
                disabledReason={generateDisabledReason}
              />
            </CardContent>
          </Card>
        </section>

        {/* Aggiunta ospiti */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Aggiungi ospiti</CardTitle>
            </CardHeader>
            <CardContent>
              {!health.ready ? (
                <p className="text-muted-foreground text-sm">{health.message}</p>
              ) : (
                <GuestPartyForm
                  stayId={stay.id}
                  countries={countries}
                  comuni={comuni}
                  documentTypes={documentTypes}
                />
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function GuestRow({
  guest,
  nested,
}: {
  guest: {
    firstName: string;
    lastName: string;
    tipoAlloggiato: TipoAlloggiato;
    schedinaStatus: string | null;
  };
  nested?: boolean;
}) {
  const badge = guest.schedinaStatus ? SCHEDINA_BADGE[guest.schedinaStatus] : null;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <User className={nested ? "text-muted-foreground size-3.5" : "size-4"} />
        <span className="truncate text-sm">
          <span className="font-medium">
            {guest.lastName} {guest.firstName}
          </span>
          <span className="text-muted-foreground"> · {TIPO_LABEL[guest.tipoAlloggiato]}</span>
        </span>
      </div>
      {badge ? (
        <Badge variant={badge.variant} className="shrink-0">
          {badge.text}
        </Badge>
      ) : (
        <Badge variant="outline" className="shrink-0">
          No schedina
        </Badge>
      )}
    </div>
  );
}
