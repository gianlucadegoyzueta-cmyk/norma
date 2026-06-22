import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, User, Users } from "lucide-react";
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
import { buildStayTimeline } from "@/server/modules/stays/domain/timeline";
import { mapAlloggiatiError } from "@/app/schedine/error-codes";
import { ReopenRejectedButton } from "@/components/reopen-rejected-button";
import { PrismaTouristTaxConfigRepository } from "@/server/modules/tourist-tax/adapters/PrismaTouristTaxConfigRepository";
import { TouristTaxEstimateService } from "@/server/modules/tourist-tax/services/estimate.service";
import { ConciergePage } from "@/components/concierge/concierge-page";
import { UnverifiedNote } from "@/components/unverified-note";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NO_SCHEDINA_LABEL, schedinaStatusDisplayOrNull } from "@/lib/schedina-status-display";
import { StayTimeline } from "./StayTimeline";
import { CheckinLinkButton } from "./CheckinLinkButton";
import { SendCheckinEmailButton } from "./SendCheckinEmailButton";
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

  // Timeline del soggiorno: storia end-to-end calcolata SOLO da dati esistenti (origine import,
  // check-in completati, ciclo schedine nell'outbox, ricevute, tassa dichiarata). Niente campi nuovi.
  const [timelineStay, timelineSchedine, timelineCheckins, timelineTaxLines] = await Promise.all([
    prisma.stay.findFirst({
      where: { id, organizationId: orgId },
      select: { createdAt: true, importSource: true },
    }),
    prisma.schedina.findMany({
      where: { organizationId: orgId, guest: { stayId: id } },
      select: { createdAt: true, sentAt: true, acquiredAt: true, receiptRef: true },
    }),
    prisma.checkinToken.findMany({
      where: { stayId: id, organizationId: orgId, completedAt: { not: null } },
      select: { completedAt: true },
    }),
    prisma.touristTaxDeclarationLine.findMany({
      where: { stayId: id, declaration: { organizationId: orgId } },
      select: {
        amountCents: true,
        declaration: { select: { createdAt: true, period: true, submittedAt: true } },
      },
    }),
  ]);
  const timeline = timelineStay
    ? buildStayTimeline({
        stay: { createdAt: timelineStay.createdAt, importSource: timelineStay.importSource },
        checkins: timelineCheckins.flatMap((c) =>
          c.completedAt ? [{ completedAt: c.completedAt }] : [],
        ),
        schedine: timelineSchedine,
        tax: timelineTaxLines.map((l) => ({
          amountCents: l.amountCents,
          countedAt: l.declaration.createdAt,
          periodLabel: l.declaration.period,
          submittedAt: l.declaration.submittedAt,
        })),
      })
    : [];

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
    <ConciergePage
      dense
      active="stays"
      backHref="/stays"
      backLabel="Soggiorni"
      kicker="DETTAGLIO · SOGGIORNO"
      title={stay.propertyName}
      intro={
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
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
        </span>
      }
    >
      {/* Storia del soggiorno: timeline end-to-end con i soli eventi realmente accaduti. */}
      {timeline.length > 0 && (
        <section className="cmx-section" style={{ marginTop: 0 }}>
          <h2 className="cmx-section-title">Timeline</h2>
          <StayTimeline events={timeline} />
        </section>
      )}

      {/* Check-in online: link pubblico da inviare all'ospite perché inserisca i propri dati. */}
      <section className="cmx-section">
        <h2 className="cmx-section-title">Check-in online</h2>
        <Card style={{ borderRadius: 18 }}>
          <CardContent className="flex flex-col gap-3 py-5">
            <p className="text-muted-foreground text-sm text-pretty">
              Genera un link da inviare agli ospiti: ognuno inserisce i propri dati (anche in
              inglese, tedesco, francese o spagnolo) e li ritrovi qui tra gli ospiti. Lo stesso link
              vale per tutti gli ospiti del soggiorno.
            </p>
            <CheckinLinkButton stayId={stay.id} />
            <div className="border-border/60 mt-1 border-t pt-3">
              <p className="text-muted-foreground mb-2 text-xs text-pretty">
                Oppure invialo direttamente via email all&apos;ospite (solo su tua richiesta: nessun
                invio automatico).
              </p>
              <SendCheckinEmailButton stayId={stay.id} />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Ospiti già inseriti */}
      <section className="cmx-section">
        <h2 className="cmx-section-title">Ospiti</h2>
        {stay.guests.length === 0 ? (
          <div className="cmx-empty">
            <p className="cmx-empty-title">Nessun ospite, per ora</p>
            <p className="cmx-empty-text">
              Aggiungili qui sotto, oppure invia il link di check-in e li ritrovi qui.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2.5">
            {leaders.map((leader) => {
              const members = membersOf(leader.id);
              return (
                <li key={leader.id}>
                  <div
                    className="cmx-row"
                    style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}
                  >
                    <GuestRow guest={leader} rejected={rejectedByGuest.get(leader.id)} />
                    {members.map((m) => (
                      <div
                        key={m.id}
                        className="border-l-2 pl-3"
                        style={{ borderColor: "var(--hairline)" }}
                      >
                        <GuestRow guest={m} nested rejected={rejectedByGuest.get(m.id)} />
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Stima imposta di soggiorno */}
      {taxEstimate && (
        <section className="cmx-section">
          <TouristTaxCard
            outcome={taxEstimate}
            guestLabels={taxGuestLabels}
            comuneName={stay.comuneName}
          />
        </section>
      )}

      {/* Generazione schedine */}
      <section className="cmx-section">
        <Card style={{ borderRadius: 18 }}>
          <CardHeader>
            <CardTitle>Genera schedine</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-muted-foreground text-sm">
              Crea una schedina PENDING per ogni ospite (idempotente: nessun doppione). L&apos;invio
              ad Alloggiati avviene poi dall&apos;outbox.
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
      <section className="cmx-section">
        <Card style={{ borderRadius: 18 }}>
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
    </ConciergePage>
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
  const badge = schedinaStatusDisplayOrNull(guest.schedinaStatus);
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
          <span className={`cmx-badge ${badge.badgeClass} shrink-0`}>{badge.label}</span>
        ) : (
          <span className="cmx-badge cmx-badge-wait shrink-0">{NO_SCHEDINA_LABEL}</span>
        )}
      </div>
      {guest.schedinaStatus === "UNVERIFIED" && <UnverifiedNote />}
      {rejected ? (
        <div className="grid gap-1.5">
          <p className="text-xs" style={{ color: "var(--terracotta-dark)" }}>
            {rejected.message}
          </p>
          <ReopenRejectedButton schedinaId={rejected.schedinaId} />
        </div>
      ) : null}
    </div>
  );
}
