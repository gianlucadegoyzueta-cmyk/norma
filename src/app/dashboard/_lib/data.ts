import "server-only";
import type { PrismaClient } from "@prisma/client";
import { OPEN_SCHEDINA_STATUSES } from "@/lib/schedina-status";
import { currentPeriod } from "@/server/modules/istat/report";
import { loadIstatSubmissionReadiness } from "@/server/modules/istat/submission-readiness-loader";
import { periodOf } from "@/server/modules/tourist-tax/domain/period";
import {
  buildConciergeDigest,
  occupancyBreakdown,
  type ConciergeEvent,
} from "@/server/modules/dashboard/concierge-digest";

/** Minuti di pratiche per ospite che Norma automatizza (base della stima "ore risparmiate"). */
export const MINUTES_SAVED_PER_GUEST = 15;

const DAY_MS = 86_400_000;
/** Finestra "stanotte": le ultime 30h coprono la notte e la prima mattina. */
const DIGEST_WINDOW_HOURS = 30;

export type ProposalAction =
  | { type: "copy-checkin"; stayId: string }
  | { type: "link"; href: string }
  | { type: "download"; href: string };

export interface DashboardProposal {
  id: string;
  emoji: string;
  /** Frase principale: `bold` apre in grassetto, poi il resto. */
  bold: string;
  rest: string;
  meta: string;
  primary: { label: string; action: ProposalAction };
  secondary?: { label: string; href: string };
  /** Riga aggiunta al diario dopo l'approvazione (azioni in-place). */
  doneText: string;
}

export interface DashboardAgendaItem {
  when: string;
  title: string;
  detail: string;
  /** Frammento "Norma: …" evidenziato in coda al dettaglio. */
  norma?: string;
}

export interface DashboardDiaryRow {
  time: string;
  text: string;
  highlight: string;
}

export interface DashboardData {
  /** Nessuna scadenza superata (overdueCount === 0). NON significa "tutto adempiuto". */
  positionRegular: boolean;
  /**
   * Schedine preparate ma NON ancora confermate/inviate (PENDING/UNVERIFIED). Finché > 0
   * l'obbligo non è assolto, anche se nulla è scaduto: il copy non deve dire "tutto in regola".
   */
  pendingSchedine: number;
  /** Schedine aperte (PENDING/UNVERIFIED) la cui deadline è già passata. Sottoinsieme urgente. */
  overdueSchedine: number;
  /** Prontezza ISTAT del mese corrente per struttura (pilastro Turismo, KPI dashboard). */
  istat: {
    ready: number;
    incomplete: number;
    assisted: number;
    unrouted: number;
    total: number;
    monthLabel: string;
  };
  receiptRef: string | null;
  acquiredYesterday: number;
  hero: { thingsDone: number };
  kpis: {
    occupancyPct: number;
    occupancyTrend: string;
    /** Notti occupate nel mese e capienza totale (per il drill-down dell'occupazione). */
    occupiedNights: number;
    capacityNights: number;
    propertyCount: number;
    guestsThisMonth: number;
    /** Schedine in attesa di conferma (PENDING/UNVERIFIED): per non dire "tutti in regola". */
    pendingSchedine: number;
    taxAccruedEuros: number;
    taxTrend: string;
    hoursSaved: number;
  };
  proposals: DashboardProposal[];
  agenda: DashboardAgendaItem[];
  diary: DashboardDiaryRow[];
}

const ROME_TZ = "Europe/Rome";

function clock(d: Date): string {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ROME_TZ,
  }).format(d);
}

function euros(cents: number): string {
  return new Intl.NumberFormat("it-IT", { minimumFractionDigits: 0 }).format(
    Math.round(cents / 100),
  );
}

/** Etichetta "GIO 12" o "OGGI"/"DOM" per l'agenda. */
function agendaWhen(d: Date, today: Date): string {
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return "OGGI";
  const giorni = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"];
  return `${giorni[d.getDay()]} ${d.getDate()}`;
}

/**
 * Compone tutti i dati REALI della dashboard concierge da Prisma. Solo letture aggregate:
 * nessun cambio di schema o di dominio. Tutto ciò che viene mostrato esiste già nel prodotto.
 */
export async function getDashboardData(
  prisma: PrismaClient,
  orgId: string,
  now: Date = new Date(),
): Promise<DashboardData> {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const weekAhead = new Date(now.getTime() + 7 * DAY_MS);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const digestCutoff = new Date(now.getTime() - DIGEST_WINDOW_HOURS * 3_600_000);
  const quarter = periodOf(now, "QUARTERLY");

  const [
    overdueCount,
    propertyCount,
    guestsThisMonth,
    monthStays,
    taxAgg,
    latestAcquired,
    pendingSchedine,
    draftStaysNoGuests,
    quarterDeclaration,
    recentImports,
    acquiredInWindow,
    latestAcquiredInWindow,
    reconciledInWindow,
    latestReconciledInWindow,
    recentIstat,
    upcomingStays,
    istatProps,
  ] = await Promise.all([
    prisma.schedina.count({
      where: {
        organizationId: orgId,
        status: { in: OPEN_SCHEDINA_STATUSES },
        deadlineAt: { lt: now },
      },
    }),
    prisma.property.count({ where: { organizationId: orgId } }),
    prisma.guest.count({ where: { organizationId: orgId, createdAt: { gte: monthStart } } }),
    prisma.stay.findMany({
      where: {
        organizationId: orgId,
        arrivalDate: { lt: monthEnd },
        OR: [{ departureDate: { gt: monthStart } }, { departureDate: null }],
      },
      select: { arrivalDate: true, departureDate: true },
    }),
    prisma.touristTaxDeclaration.aggregate({
      where: { organizationId: orgId, period: quarter },
      _sum: { amountCents: true },
    }),
    prisma.schedina.findFirst({
      where: { organizationId: orgId, status: "ACQUIRED", receiptRef: { not: null } },
      orderBy: { acquiredAt: "desc" },
      select: { receiptRef: true },
    }),
    prisma.schedina.count({
      where: { organizationId: orgId, status: { in: ["PENDING", "UNVERIFIED"] } },
    }),
    prisma.stay.findMany({
      where: {
        organizationId: orgId,
        importStatus: { not: null },
        guests: { none: {} },
      },
      orderBy: { arrivalDate: "asc" },
      select: { id: true, arrivalDate: true, property: { select: { name: true } } },
      take: 3,
    }),
    prisma.touristTaxDeclaration.findFirst({
      where: { organizationId: orgId, period: quarter, status: { in: ["DRAFT", "READY"] } },
      select: { id: true, amountCents: true },
    }),
    prisma.reservationImport.findMany({
      where: { organizationId: orgId, lastSyncAt: { gte: digestCutoff }, lastImported: { gt: 0 } },
      orderBy: { lastSyncAt: "desc" },
      select: { lastSyncAt: true, lastImported: true, source: true },
      take: 5,
    }),
    prisma.schedina.count({
      where: { organizationId: orgId, status: "ACQUIRED", acquiredAt: { gte: digestCutoff } },
    }),
    prisma.schedina.findFirst({
      where: { organizationId: orgId, status: "ACQUIRED", acquiredAt: { gte: digestCutoff } },
      orderBy: { acquiredAt: "desc" },
      select: { acquiredAt: true },
    }),
    prisma.schedina.count({
      where: { organizationId: orgId, reconciledAt: { gte: digestCutoff } },
    }),
    prisma.schedina.findFirst({
      where: { organizationId: orgId, reconciledAt: { gte: digestCutoff } },
      orderBy: { reconciledAt: "desc" },
      select: { reconciledAt: true },
    }),
    prisma.istatSubmission.findMany({
      where: { organizationId: orgId, submittedAt: { gte: digestCutoff } },
      orderBy: { submittedAt: "desc" },
      select: { submittedAt: true, period: true, arriviTotal: true },
      take: 3,
    }),
    prisma.stay.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { arrivalDate: { gte: startOfToday, lte: weekAhead } },
          { departureDate: { gte: startOfToday, lte: weekAhead } },
        ],
      },
      orderBy: { arrivalDate: "asc" },
      select: {
        id: true,
        arrivalDate: true,
        departureDate: true,
        guestsCount: true,
        property: { select: { name: true } },
        checkinTokens: { select: { completedAt: true } },
        _count: { select: { guests: true } },
      },
      take: 12,
    }),
    // Strutture (con provincia) per la prontezza ISTAT del mese: alimenta il KPI del pilastro Turismo.
    prisma.property.findMany({
      where: { organizationId: orgId },
      select: { id: true, name: true, comune: { select: { provincia: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  // ---- Prontezza ISTAT del mese (riusa il loader di /istat, niente logica nuova) ----
  const istatPeriod = currentPeriod(now);
  const istatReadiness =
    istatProps.length > 0
      ? await loadIstatSubmissionReadiness(
          prisma,
          orgId,
          istatPeriod,
          istatProps.map((p) => ({ id: p.id, name: p.name, provincia: p.comune.provincia })),
        )
      : [];
  let istatReady = 0;
  let istatIncomplete = 0;
  let istatAssisted = 0;
  let istatUnrouted = 0;
  for (const r of istatReadiness) {
    switch (r.readiness.status) {
      case "READY":
        istatReady++;
        break;
      case "INCOMPLETE":
        istatIncomplete++;
        break;
      case "ASSISTED":
        istatAssisted++;
        break;
      case "UNROUTED":
        istatUnrouted++;
        break;
    }
  }
  const istatMonthLabel = new Intl.DateTimeFormat("it-IT", {
    month: "long",
    timeZone: ROME_TZ,
  }).format(now);

  // ---- KPI ----
  const occupancy = occupancyBreakdown(monthStays, { monthStart, monthEnd, propertyCount });
  const occupancyPct = Math.min(100, occupancy.pct);
  const taxAccruedCents = taxAgg._sum.amountCents ?? 0;
  const hoursSaved = Math.round((guestsThisMonth * MINUTES_SAVED_PER_GUEST) / 60);

  // ---- Diario "Fatto da Norma" (eventi reali) ----
  const events: ConciergeEvent[] = [];
  for (const imp of recentImports) {
    if (!imp.lastSyncAt) continue;
    events.push({
      at: imp.lastSyncAt,
      kind: "ical-sync",
      text: "Calendario sincronizzato",
      highlight: `${imp.lastImported} ${imp.lastImported === 1 ? "prenotazione" : "prenotazioni"}`,
    });
  }
  if (acquiredInWindow > 0 && latestAcquiredInWindow?.acquiredAt) {
    events.push({
      at: latestAcquiredInWindow.acquiredAt,
      kind: "schedina-acquired",
      text: "Ricevuta Questura verificata",
      highlight: `${acquiredInWindow} ${acquiredInWindow === 1 ? "schedina acquisita" : "schedine acquisite"}`,
    });
  }
  if (reconciledInWindow > 0 && latestReconciledInWindow?.reconciledAt) {
    events.push({
      at: latestReconciledInWindow.reconciledAt,
      kind: "schedina-reconciled",
      text: "Riconciliazione completata",
      highlight: `${reconciledInWindow} ${reconciledInWindow === 1 ? "schedina" : "schedine"}`,
    });
  }
  for (const ist of recentIstat) {
    events.push({
      at: ist.submittedAt,
      kind: "istat-submitted",
      text: `ISTAT inviato · ${ist.period}`,
      highlight: `${ist.arriviTotal} arrivi`,
    });
  }
  const digest = buildConciergeDigest(events, { now, windowHours: DIGEST_WINDOW_HOURS });
  const diary: DashboardDiaryRow[] = digest.rows.map((r) => ({
    time: clock(r.at),
    text: r.text,
    highlight: r.highlight,
  }));

  // ---- Proposte (SOLO azioni che esistono già) ----
  const proposals: DashboardProposal[] = [];

  // a) Check-in mancante per arrivo imminente
  const arrivalNeedingCheckin = upcomingStays.find(
    (s) =>
      s.arrivalDate >= startOfToday &&
      s.arrivalDate <= weekAhead &&
      !s.checkinTokens.some((t) => t.completedAt),
  );
  if (arrivalNeedingCheckin) {
    const dateLabel = new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "2-digit",
      timeZone: ROME_TZ,
    }).format(arrivalNeedingCheckin.arrivalDate);
    proposals.push({
      id: `checkin-${arrivalNeedingCheckin.id}`,
      emoji: "🛎️",
      bold: `Arrivo il ${dateLabel} a ${arrivalNeedingCheckin.property.name}`,
      rest: " senza check-in completato. Ho pronto il link personale dell'ospite: copialo e mandaglielo, poi ti preparo la schedina dai suoi dati.",
      meta: `${arrivalNeedingCheckin.guestsCount} ${arrivalNeedingCheckin.guestsCount === 1 ? "ospite" : "ospiti"} · check-in self-service`,
      primary: {
        label: "Copia link check-in",
        action: { type: "copy-checkin", stayId: arrivalNeedingCheckin.id },
      },
      secondary: { label: "Apri soggiorno", href: `/stays/${arrivalNeedingCheckin.id}` },
      doneText: "Link di check-in pronto da mandare",
    });
  }

  // b) Schedine preparate in attesa di conferma
  if (pendingSchedine > 0) {
    proposals.push({
      id: "schedine-pending",
      emoji: "🧾",
      bold: `${pendingSchedine} ${pendingSchedine === 1 ? "schedina in coda" : "schedine in coda"} per l'invio.`,
      rest: " Dati validati su mandato Alloggiati: con l'auto-invio attivo partono da sole; altrimenti le invii da qui.",
      meta: "outbox · le più urgenti in cima",
      primary: { label: "Vai alle schedine", action: { type: "link", href: "/schedine" } },
      doneText: "Schedine aperte in outbox",
    });
  }

  // c) Bozze importate da iCal senza ospiti
  if (draftStaysNoGuests.length > 0) {
    const first = draftStaysNoGuests[0];
    proposals.push({
      id: "ical-drafts",
      emoji: "📅",
      bold: `${draftStaysNoGuests.length} ${draftStaysNoGuests.length === 1 ? "bozza importata" : "bozze importate"} dal calendario senza ospiti.`,
      rest: " Completa i dati degli ospiti: con il mandato attivo preparo e invio le schedine in automatico.",
      meta: `import iCal · ${first.property.name}`,
      primary: { label: "Completa ospiti", action: { type: "link", href: `/stays/${first.id}` } },
      secondary: { label: "Vedi soggiorni", href: "/stays" },
      doneText: "Bozze aperte per il completamento",
    });
  }

  // d) Export tassa di soggiorno del trimestre
  if (quarterDeclaration) {
    proposals.push({
      id: "tax-export",
      emoji: "💶",
      bold: `Export tassa di soggiorno pronto: €${euros(quarterDeclaration.amountCents)}.`,
      rest: ` Dichiarazione del ${quarter} nel formato del Comune, pronta da scaricare per il versamento.`,
      meta: `${quarter} · tutte le strutture`,
      primary: { label: "Apri tassa di soggiorno", action: { type: "link", href: "/tourist-tax" } },
      doneText: "Tassa di soggiorno aperta",
    });
  }

  // ---- Agenda della settimana ----
  const agenda: DashboardAgendaItem[] = [];
  agenda.push(
    overdueCount > 0
      ? {
          when: "OGGI",
          title: `${overdueCount} ${overdueCount === 1 ? "schedina" : "schedine"} oltre scadenza`,
          detail:
            "Da gestire subito: oltre le 24h dall'arrivo la comunicazione ad Alloggiati è tardiva. Apri Schedine.",
        }
      : pendingSchedine > 0
        ? {
            when: "OGGI",
            title: "Nessuna scadenza superata",
            detail: `${pendingSchedine} ${pendingSchedine === 1 ? "schedina" : "schedine"} in coda per l'invio su mandato: nulla è scaduto, ma l'obbligo si chiude con l'invio.`,
          }
        : {
            when: "OGGI",
            title: "Nessun obbligo in scadenza",
            detail: "Nessuna scadenza superata su tutte le strutture.",
          },
  );
  for (const s of upcomingStays) {
    if (s.arrivalDate >= startOfToday && s.arrivalDate <= weekAhead) {
      agenda.push({
        when: agendaWhen(s.arrivalDate, now),
        title: `Arrivo ${s.property.name} · ${s.guestsCount} ${s.guestsCount === 1 ? "ospite" : "ospiti"}`,
        detail: "Schedina pronta entro le 24h dall'arrivo,",
        norma:
          s._count.guests > 0
            ? "con mandato attivo la invio, altrimenti la gestisci da Schedine"
            : "completa gli ospiti e con il mandato la invio per te",
      });
    }
    if (s.departureDate && s.departureDate >= startOfToday && s.departureDate <= weekAhead) {
      agenda.push({
        when: agendaWhen(s.departureDate, now),
        title: `Partenza ${s.property.name}`,
        detail: "Conteggio tassa di soggiorno",
        norma: "lo tengo aggiornato, pronto per la dichiarazione",
      });
    }
  }
  if (quarterDeclaration) {
    agenda.push({
      when: quarter,
      title: "Versamento tassa di soggiorno",
      detail: `€${euros(quarterDeclaration.amountCents)} · export già pronto`,
    });
  }

  return {
    positionRegular: overdueCount === 0,
    pendingSchedine,
    overdueSchedine: overdueCount,
    istat: {
      ready: istatReady,
      incomplete: istatIncomplete,
      assisted: istatAssisted,
      unrouted: istatUnrouted,
      total: istatReadiness.length,
      monthLabel: istatMonthLabel,
    },
    receiptRef: latestAcquired?.receiptRef ?? null,
    acquiredYesterday: acquiredInWindow,
    hero: { thingsDone: digest.thingsDone },
    kpis: {
      occupancyPct,
      occupancyTrend: occupancyPct > 0 ? "sui soggiorni del mese" : "nessun soggiorno questo mese",
      occupiedNights: occupancy.occupiedNights,
      capacityNights: occupancy.capacityNights,
      propertyCount,
      guestsThisMonth,
      pendingSchedine,
      taxAccruedEuros: Math.round(taxAccruedCents / 100),
      taxTrend: taxAccruedCents > 0 ? "registro aggiornato" : "nessun importo maturato",
      hoursSaved,
    },
    proposals,
    agenda,
    diary,
  };
}
