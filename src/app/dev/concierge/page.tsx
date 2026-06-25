import { notFound } from "next/navigation";
import { ConciergeScene } from "@/components/dashboard/concierge-scene";
import type { DashboardData } from "@/app/dashboard/_lib/data";
import { buildSceneCopy } from "@/app/dashboard/_lib/scene";
import type { PropertyStatus } from "@/components/dashboard/concierge-properties";
import type { ComplianceMonth } from "@/components/dashboard/concierge-compliance";
import "@/app/dashboard/concierge.css";

// Anteprima visiva NON di produzione: rende la scena Concierge con dati di esempio per
// screenshottare ogni stato (pieno/vuoto) senza DB né login. 404 in produzione.
export const dynamic = "force-dynamic";

const FULL: DashboardData = {
  positionRegular: true,
  pendingSchedine: 3,
  overdueSchedine: 1,
  istat: { ready: 2, incomplete: 1, assisted: 0, unrouted: 0, total: 3, monthLabel: "giugno" },
  receiptRef: "2026/398755",
  acquiredYesterday: 2,
  hero: { thingsDone: 3 },
  kpis: {
    occupancyPct: 74,
    occupancyTrend: "sui soggiorni del mese",
    occupiedNights: 67,
    capacityNights: 90,
    propertyCount: 3,
    guestsThisMonth: 38,
    pendingSchedine: 3,
    taxAccruedEuros: 312,
    taxTrend: "registro aggiornato",
    hoursSaved: 9,
  },
  proposals: [
    {
      id: "checkin-1",
      emoji: "🛎️",
      bold: "Arrivo il 13/06 a Farnesina 11C",
      rest: " senza check-in completato. Ho pronto il link personale dell'ospite: copialo e mandaglielo, al resto penso io.",
      meta: "2 ospiti · check-in self-service",
      primary: { label: "Copia link check-in", action: { type: "copy-checkin", stayId: "demo" } },
      secondary: { label: "Apri soggiorno", href: "/stays/demo" },
      doneText: "Link di check-in pronto da mandare",
    },
    {
      id: "schedine-pending",
      emoji: "🧾",
      bold: "3 schedine pronte in attesa di conferma.",
      rest: " Le ho preparate dai dati degli ospiti; dai un'occhiata e confermale per l'invio ad Alloggiati.",
      meta: "outbox · le più urgenti in cima",
      primary: { label: "Vai alle schedine", action: { type: "link", href: "/schedine" } },
      doneText: "Schedine aperte per la conferma",
    },
    {
      id: "tax-export",
      emoji: "💶",
      bold: "Export tassa di soggiorno pronto: €312.",
      rest: " Dichiarazione del 2026-Q2 nel formato del Comune, pronta da scaricare per il versamento.",
      meta: "2026-Q2 · tutte le strutture",
      primary: { label: "Apri tassa di soggiorno", action: { type: "link", href: "/tourist-tax" } },
      doneText: "Tassa di soggiorno aperta",
    },
  ],
  agenda: [
    {
      when: "OGGI",
      title: "Nessuna scadenza superata",
      detail:
        "3 schedine in attesa della tua conferma: nulla è scaduto, ma l'obbligo si chiude quando confermi l'invio.",
    },
    {
      when: "VEN 13",
      title: "Arrivo Farnesina 11C · 2 ospiti",
      detail: "Schedina pronta entro le 24h dall'arrivo,",
      norma: "la confermi con un tocco",
    },
    {
      when: "SAB 14",
      title: "Partenza Carpe Diem",
      detail: "Conteggio tassa di soggiorno",
      norma: "aggiornato in automatico",
    },
    {
      when: "2026-Q2",
      title: "Versamento tassa di soggiorno",
      detail: "€312 · export già pronto",
    },
  ],
  diary: [
    { time: "03:00", text: "Calendario sincronizzato", highlight: "2 prenotazioni" },
    { time: "06:10", text: "Ricevuta Questura verificata", highlight: "2 schedine acquisite" },
    { time: "06:12", text: "Riconciliazione completata", highlight: "2 schedine" },
  ],
};

const EMPTY: DashboardData = {
  positionRegular: true,
  pendingSchedine: 0,
  overdueSchedine: 0,
  istat: { ready: 0, incomplete: 0, assisted: 0, unrouted: 0, total: 0, monthLabel: "giugno" },
  receiptRef: null,
  acquiredYesterday: 0,
  hero: { thingsDone: 0 },
  kpis: {
    occupancyPct: 0,
    occupancyTrend: "nessun soggiorno questo mese",
    occupiedNights: 0,
    capacityNights: 90,
    propertyCount: 3,
    guestsThisMonth: 0,
    pendingSchedine: 0,
    taxAccruedEuros: 0,
    taxTrend: "nessun importo maturato",
    hoursSaved: 0,
  },
  proposals: [],
  agenda: [
    {
      when: "OGGI",
      title: "Nessun obbligo in scadenza",
      detail: "Nessuna scadenza superata su tutte le strutture.",
    },
  ],
  diary: [],
};

const MOCK_PROPERTIES: PropertyStatus[] = [
  {
    id: "p1",
    name: "Farnesina 11C",
    city: "Roma",
    occupancyPct: 82,
    pendingSchedine: 2,
    status: "wait",
    nextLabel: "arrivo VEN 13",
  },
  {
    id: "p2",
    name: "Carpe Diem",
    city: "Roma",
    occupancyPct: 67,
    pendingSchedine: 1,
    status: "wait",
    nextLabel: "partenza SAB 14",
  },
  {
    id: "p3",
    name: "Trastevere Loft",
    city: "Roma",
    occupancyPct: 74,
    pendingSchedine: 0,
    status: "ok",
    nextLabel: "in regola",
  },
];

const EMPTY_PROPERTIES: PropertyStatus[] = [
  {
    id: "p1",
    name: "Farnesina 11C",
    city: "Roma",
    occupancyPct: 0,
    pendingSchedine: 0,
    status: "ok",
  },
  { id: "p2", name: "Carpe Diem", city: "Roma", occupancyPct: 0, pendingSchedine: 0, status: "ok" },
  {
    id: "p3",
    name: "Trastevere Loft",
    city: "Roma",
    occupancyPct: 0,
    pendingSchedine: 0,
    status: "ok",
  },
];

/** 12 mesi, da luglio (un anno fa) a giugno: iniziali del mese IT. */
const cm = (label: string, status: ComplianceMonth["status"], title: string): ComplianceMonth => ({
  label,
  status,
  title,
});
const MOCK_COMPLIANCE = {
  months: [
    cm("L", "regular", "Luglio · in regola"),
    cm("A", "regular", "Agosto · in regola"),
    cm("S", "regular", "Settembre · in regola"),
    cm("O", "regular", "Ottobre · in regola"),
    cm("N", "attention", "Novembre · 1 schedina tardiva"),
    cm("D", "regular", "Dicembre · in regola"),
    cm("G", "regular", "Gennaio · in regola"),
    cm("F", "regular", "Febbraio · in regola"),
    cm("M", "regular", "Marzo · in regola"),
    cm("A", "regular", "Aprile · in regola"),
    cm("M", "regular", "Maggio · in regola"),
    cm("G", "attention", "Giugno · 3 schedine da confermare"),
  ],
  summary: "ultimo anno quasi tutto in regola",
};
const EMPTY_COMPLIANCE = {
  months: [
    cm("L", "quiet", "Luglio · nessun movimento"),
    cm("A", "quiet", "Agosto · nessun movimento"),
    cm("S", "quiet", "Settembre · nessun movimento"),
    cm("O", "quiet", "Ottobre · nessun movimento"),
    cm("N", "quiet", "Novembre · nessun movimento"),
    cm("D", "quiet", "Dicembre · nessun movimento"),
    cm("G", "quiet", "Gennaio · nessun movimento"),
    cm("F", "quiet", "Febbraio · nessun movimento"),
    cm("M", "quiet", "Marzo · nessun movimento"),
    cm("A", "quiet", "Aprile · nessun movimento"),
    cm("M", "quiet", "Maggio · nessun movimento"),
    cm("G", "quiet", "Giugno · ancora nessun movimento"),
  ],
  summary: "appena registri il primo ospite, comincio a riempirlo",
};

export default async function ConciergePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; name?: string; audience?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { state, name, audience } = await searchParams;
  const isEmpty = state === "empty";
  const data = isEmpty ? EMPTY : FULL;
  const now = new Date("2026-06-11T09:00:00Z");
  // `?name=none` simula l'utente senza nome (fallback saluto elegante senza nome).
  const firstName = name === "none" ? null : "Gianluca";
  const copy = buildSceneCopy(data, { firstName, now, proposals: data.proposals });
  // `?audience=pm` mostra la testata per-struttura del property manager.
  const aud = audience === "pm" ? "pm" : "host";
  const tools = {
    alloggiati: { pending: data.kpis.pendingSchedine, overdue: data.overdueSchedine },
    turismo: {
      istatReady: data.istat.ready,
      istatTotal: data.istat.total,
      taxEuros: data.kpis.taxAccruedEuros,
      monthLabel: data.istat.monthLabel,
    },
  } as const;

  return (
    <ConciergeScene
      orgName="Demo · Anteprima"
      lastCheck={copy.lastCheck}
      kicker={copy.kicker}
      lines={copy.lines}
      sub={copy.sub}
      kpis={copy.kpis}
      proposals={data.proposals}
      agenda={data.agenda}
      diary={data.diary}
      properties={isEmpty ? EMPTY_PROPERTIES : MOCK_PROPERTIES}
      compliance={isEmpty ? EMPTY_COMPLIANCE : MOCK_COMPLIANCE}
      tools={tools}
      audience={aud}
    />
  );
}
