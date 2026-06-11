import type { HeroSegment } from "@/components/dashboard/concierge-hero";
import type { KpiSpec } from "@/components/dashboard/concierge-kpis";
import { MINUTES_SAVED_PER_GUEST, type DashboardData, type DashboardProposal } from "./data";

const ROME_TZ = "Europe/Rome";
const QUARTER_LABEL: Record<string, string> = {
  Q1: "I trim",
  Q2: "II trim",
  Q3: "III trim",
  Q4: "IV trim",
};

/** Le cose VERE che Norma gestisce — parole che si auto-sostituiscono nell'hero. */
const NORMA_HANDLES = ["le tue schedine", "la tassa di soggiorno", "l'ISTAT", "i tuoi check-in"];

function greetingFor(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat("it-IT", { hour: "2-digit", hour12: false, timeZone: ROME_TZ }).format(
      now,
    ),
  );
  if (hour < 12) return "Buongiorno";
  if (hour < 18) return "Buon pomeriggio";
  return "Buonasera";
}

export interface SceneCopy {
  kicker: string;
  lines: HeroSegment[][];
  sub: { text: string; bold?: string };
  kpis: KpiSpec[];
  lastCheck: string | null;
}

/**
 * Trasforma i dati reali della dashboard nei testi/KPI della scena (hero "ink reveal" con
 * parola rotante, kicker, sub, odometri cliccabili). Separato dalla pagina per essere
 * riusabile dall'anteprima visiva.
 *
 * `firstName` è il PRIMO nome reale dell'utente, o `null`: in quel caso il saluto resta
 * elegante senza nome ("Buongiorno.").
 */
export function buildSceneCopy(
  data: DashboardData,
  opts: { firstName: string | null; now: Date; proposals: DashboardProposal[] },
): SceneCopy {
  const { firstName, now, proposals } = opts;
  const k = proposals.length;
  const things = data.hero.thingsDone;

  // --- Hero: saluto · cosa Norma tiene in regola (rotante) · stato concreto di oggi ---
  const lines: HeroSegment[][] = [];
  const greeting = greetingFor(now);
  lines.push([{ text: firstName ? `${greeting} ${firstName}.` : `${greeting}.` }]);
  lines.push([{ text: "Tengo in regola " }, { rotate: NORMA_HANDLES }, { text: "." }]);

  if (things > 0) {
    const noun = things === 1 ? "cosa" : "cose";
    if (k > 0) {
      const dnoun = k === 1 ? "decisione" : "decisioni";
      const verb = k === 1 ? "aspetta" : "aspettano";
      lines.push([
        { text: "Stanotte ho sistemato " },
        { text: `${things} ${noun}`, hi: true },
        { text: `; ${k} ${dnoun} ${verb} il tuo via libera.` },
      ]);
    } else {
      lines.push([
        { text: "Stanotte ho sistemato " },
        { text: `${things} ${noun}`, hi: true },
        { text: ". Per oggi non serve altro." },
      ]);
    }
  } else if (k > 0) {
    const dnoun = k === 1 ? "decisione" : "decisioni";
    const intro = k === 1 ? "C'è " : "Ci sono ";
    const rel = k === 1 ? "che aspetta" : "che aspettano";
    lines.push([
      { text: intro },
      { text: `${k} ${dnoun}`, hi: true },
      { text: ` ${rel} il tuo via libera.` },
    ]);
  } else {
    lines.push([{ text: "Oggi è tutto in regola: nessuna scadenza da gestire." }]);
  }

  const sub =
    data.acquiredYesterday > 0 && data.receiptRef
      ? {
          bold: "Le schedine di ieri sono state acquisite dalla Questura",
          text: `(ricevuta n. ${data.receiptRef}). Decidi tu, eseguo io.`,
        }
      : { bold: "Decidi tu, eseguo io.", text: "Norma prepara, tu approvi con un tocco." };

  const kicker = `${new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: ROME_TZ,
  }).format(now)} · posizione ${data.positionRegular ? "regolare" : "da sistemare"}`;

  const monthName = new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: ROME_TZ }).format(
    now,
  );
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;
  const quarterLabel = QUARTER_LABEL[quarter];
  const { occupancyPct, occupiedNights, capacityNights, propertyCount, guestsThisMonth } =
    data.kpis;
  const tax = data.kpis.taxAccruedEuros;
  const hours = data.kpis.hoursSaved;

  const kpis: KpiSpec[] = [
    {
      value: occupancyPct,
      suffix: "%",
      label: `occupazione ${monthName}`,
      trend: data.kpis.occupancyTrend,
      detail: {
        title: `Occupazione di ${monthName}`,
        intro:
          occupancyPct > 0
            ? `${occupancyPct}% delle notti disponibili sono occupate.`
            : "Ancora nessuna notte occupata questo mese.",
        rows: [
          { label: "Notti occupate", value: `${occupiedNights}` },
          { label: "Notti disponibili", value: `${capacityNights}` },
          { label: "Immobili", value: `${propertyCount}` },
        ],
        note: "Calcolata sui soggiorni che coprono il mese, su tutte le tue strutture.",
        link: { label: "Apri i soggiorni del mese", href: "/stays" },
      },
    },
    {
      value: guestsThisMonth,
      label: `ospiti registrati · ${monthName}`,
      trend: guestsThisMonth > 0 ? "tutti in regola" : "nessuno questo mese",
      detail: {
        title: `Ospiti registrati · ${monthName}`,
        intro:
          guestsThisMonth > 0
            ? `${guestsThisMonth} ${guestsThisMonth === 1 ? "ospite registrato" : "ospiti registrati"} questo mese.`
            : "Ancora nessun ospite registrato questo mese.",
        rows: [
          { label: "Ospiti nel mese", value: `${guestsThisMonth}` },
          { label: "Stato schedine", value: guestsThisMonth > 0 ? "tutte in regola" : "—" },
        ],
        note: "Ogni ospite registrato diventa una schedina pronta per Alloggiati Web.",
        link: { label: "Vai ai soggiorni", href: "/stays" },
      },
    },
    {
      value: tax,
      prefix: "€",
      label: `tassa maturata · ${quarterLabel}`,
      trend: data.kpis.taxTrend,
      due: tax > 0,
      detail: {
        title: `Tassa di soggiorno · ${quarterLabel}`,
        intro:
          tax > 0 ? `€${tax} maturati nel trimestre.` : "Nessun importo maturato nel trimestre.",
        rows: [
          { label: "Maturata", value: `€${tax}` },
          { label: "Trimestre", value: quarterLabel },
          { label: "Stato", value: tax > 0 ? "registro aggiornato" : "nessun importo" },
        ],
        note: "Pronta da esportare nel formato del Comune per il versamento.",
        link: { label: "Apri la tassa di soggiorno", href: "/tourist-tax" },
      },
    },
    {
      value: hours,
      label: "ore risparmiate nel mese",
      trend: guestsThisMonth > 0 ? `stimate su ${guestsThisMonth} ospiti` : "stima sugli ospiti",
      detail: {
        title: "Ore risparmiate nel mese",
        intro:
          hours > 0
            ? `Circa ${hours} ${hours === 1 ? "ora" : "ore"} di pratiche che non hai dovuto fare.`
            : "La stima cresce con gli ospiti registrati.",
        rows: [
          { label: "Ospiti nel mese", value: `${guestsThisMonth}` },
          { label: "Minuti per ospite", value: `${MINUTES_SAVED_PER_GUEST} min` },
          { label: "Totale risparmiato", value: `${hours} ${hours === 1 ? "ora" : "ore"}` },
        ],
        note: `Stima: ${MINUTES_SAVED_PER_GUEST} minuti di pratiche per ospite (compilazione schedina, invio, archivio), automatizzati da Norma.`,
        link: { label: "Vedi le schedine", href: "/schedine" },
      },
    },
  ];

  const lastCheck = data.diary.length > 0 ? data.diary[data.diary.length - 1].time : null;

  return { kicker, lines, sub, kpis, lastCheck };
}
