import { notFound } from "next/navigation";
import { ConciergeScene } from "@/components/dashboard/concierge-scene";
import type { DashboardData } from "@/app/dashboard/_lib/data";
import { buildSceneCopy } from "@/app/dashboard/_lib/scene";
import "@/app/dashboard/concierge.css";

// Anteprima visiva NON di produzione: rende la scena Concierge con dati di esempio per
// screenshottare ogni stato (pieno/vuoto) senza DB né login. 404 in produzione.
export const dynamic = "force-dynamic";

const FULL: DashboardData = {
  positionRegular: true,
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
      title: "Nessun obbligo in scadenza",
      detail: "Posizione regolare su tutte le strutture.",
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
    taxAccruedEuros: 0,
    taxTrend: "nessun importo maturato",
    hoursSaved: 0,
  },
  proposals: [],
  agenda: [
    {
      when: "OGGI",
      title: "Nessun obbligo in scadenza",
      detail: "Posizione regolare su tutte le strutture.",
    },
  ],
  diary: [],
};

export default async function ConciergePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; name?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();
  const { state, name } = await searchParams;
  const data = state === "empty" ? EMPTY : FULL;
  const now = new Date("2026-06-11T09:00:00Z");
  // `?name=none` simula l'utente senza nome (fallback saluto elegante senza nome).
  const firstName = name === "none" ? null : "Gianluca";
  const copy = buildSceneCopy(data, { firstName, now, proposals: data.proposals });

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
    />
  );
}
