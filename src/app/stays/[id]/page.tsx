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
import { mapAlloggiatiError } from "@/app/schedine/error-codes";
import { ReopenRejectedButton } from "@/components/reopen-rejected-button";
import { PrismaTouristTaxConfigRepository } from "@/server/modules/tourist-tax/adapters/PrismaTouristTaxConfigRepository";
import { TouristTaxEstimateService } from "@/server/modules/tourist-tax/services/estimate.service";
import { SiteHeader } from "@/components/site-header";
import { UnverifiedNote } from "@/components/unverified-note";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateSchedineButton } from "./GenerateSchedineButton";
import { GuestPartyForm } from "./GuestPartyForm";
import { TouristTaxCard } from "./TouristTaxCard";

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

  // Schedine REJECTED del soggiorno → mappa per ospite (id schedina + messaggio azionabile).
  // Query di pagina: serve l'id schedina (per il reopen) e gli errori, non esposti da StayDetail.
  const rejectedRows = await prisma.schedina.findMany({
    where: { organizationId: orgId, status: "REJECTED", guest: { stayId: id } },
    select: { id: true, guestId: true, lastErrorCod: true, lastErrorDes: true },
  });
  const rejectedByGuest = new Map<string, { schedinaId: string; message: string }>();
  for (const r of rejectedRows) {
    rejectedByGuest.set(r.guestId, {
      schedinaId: r.id,
      message: mapAlloggiatiError(r.lastErrorCod, r.lastErrorDes),
    });
  }

  // Stima imposta di soggiorno. Query dedicata (isolata per org) per i campi che servono al
  // calcolo, senza accoppiare il modulo stays a tourist-tax. La regola è scelta in base al
  // comune e alla DATA del soggiorno; se manca, l'esito è NO_RULE (stato esplicito in UI).
  const taxStay = await prisma.stay.findFirst({
    where: { id, organizationId: orgId },
    select: {
      arrivalDate: true,
      departureDate: true,
      property: {
        select: {
          comuneId: true,
          accommodationCategory: true,
          touristTaxZone: true,
          comune: { select: { name: true } },
        },
      },
      guests: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          taxExemptionType: true,
        },
      },
    },
  });
  const taxEstimate = taxStay
    ? await new TouristTaxEstimateService(
        new PrismaTouristTaxConfigRepository(prisma),
      ).estimateForStay({
        comuneId: taxStay.property.comuneId,
        arrivalDate: taxStay.arrivalDate,
        departureDate: taxStay.departureDate,
        accommodationCategory: taxStay.property.accommodationCategory,
        touristTaxZone: taxStay.property.touristTaxZone,
        guests: taxStay.guests.map((g) => ({
          id: g.id,
          birthDate: g.birthDate,
          taxExemptionType: g.taxExemptionType,
        })),
      })
    : null;
  const taxGuestLabels = (taxStay?.guests ?? []).map((g) => ({
    id: g.id,
    name: `${g.lastName} ${g.firstName}`,
  }));

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

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl px-4 py-8 outline-none sm:px-6 sm:py-10"
      >
        <Link
          href="/stays"
          className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Soggiorni
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {stay.propertyName}
          </h1>
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
                        <GuestRow guest={leader} rejected={rejectedByGuest.get(leader.id)} />
                        {members.map((m) => (
                          <div key={m.id} className="border-border/60 border-l-2 pl-3">
                            <GuestRow guest={m} nested rejected={rejectedByGuest.get(m.id)} />
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

        {/* Stima imposta di soggiorno */}
        {taxEstimate && (
          <section className="mb-8">
            <TouristTaxCard
              outcome={taxEstimate}
              guestLabels={taxGuestLabels}
              comuneName={stay.comuneName}
            />
          </section>
        )}

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
  rejected,
}: {
  guest: {
    firstName: string;
    lastName: string;
    tipoAlloggiato: TipoAlloggiato;
    schedinaStatus: string | null;
  };
  nested?: boolean;
  rejected?: { schedinaId: string; message: string };
}) {
  const badge = guest.schedinaStatus ? SCHEDINA_BADGE[guest.schedinaStatus] : null;
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <User aria-hidden className={nested ? "text-muted-foreground size-3.5" : "size-4"} />
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
      {guest.schedinaStatus === "UNVERIFIED" && <UnverifiedNote />}
      {rejected ? (
        <div className="grid gap-1.5">
          <p className="text-destructive text-xs">{rejected.message}</p>
          <ReopenRejectedButton schedinaId={rejected.schedinaId} />
        </div>
      ) : null}
    </div>
  );
}
