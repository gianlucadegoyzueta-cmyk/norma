import type { HeroSegment } from "@/components/dashboard/concierge-hero";
import type { KpiSpec } from "@/components/dashboard/concierge-kpis";
import type { DashboardData, DashboardProposal } from "./data";

const ROME_TZ = "Europe/Rome";
const QUARTER_LABEL: Record<string, string> = {
  Q1: "I trim",
  Q2: "II trim",
  Q3: "III trim",
  Q4: "IV trim",
};

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
 * Trasforma i dati reali della dashboard nei testi/KPI della scena (hero "ink reveal",
 * kicker, sub, odometri). Separato dalla pagina per essere riusabile dall'anteprima visiva.
 */
export function buildSceneCopy(
  data: DashboardData,
  opts: { firstName: string; now: Date; proposals: DashboardProposal[] },
): SceneCopy {
  const { firstName, now, proposals } = opts;
  const k = proposals.length;
  const hasL3 = k > 0;

  const lines: HeroSegment[][] = [];
  lines.push([{ text: `${greetingFor(now)} ${firstName}.` }]);
  if (data.hero.thingsDone > 0) {
    const noun = data.hero.thingsDone === 1 ? "cosa" : "cose";
    lines.push([
      { text: "Stanotte ho fatto " },
      { text: `${data.hero.thingsDone} ${noun}`, hi: true },
      { text: hasL3 ? " per te," : " per te." },
    ]);
  } else {
    lines.push([
      { text: hasL3 ? "Ho dato un'occhiata a tutto," : "Tutto in ordine, nessuna novità." },
    ]);
  }
  if (hasL3) {
    lines.push([{ text: `e ${k} ${k === 1 ? "aspetta" : "aspettano"} solo un tuo sì.` }]);
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
  const kpis: KpiSpec[] = [
    {
      value: data.kpis.occupancyPct,
      suffix: "%",
      label: `occupazione ${monthName}`,
      trend: data.kpis.occupancyTrend,
    },
    {
      value: data.kpis.guestsThisMonth,
      label: `ospiti registrati · ${monthName}`,
      trend: data.kpis.guestsThisMonth > 0 ? "tutti in regola" : "nessuno questo mese",
    },
    {
      value: data.kpis.taxAccruedEuros,
      prefix: "€",
      label: `tassa maturata · ${QUARTER_LABEL[quarter]}`,
      trend: data.kpis.taxTrend,
      due: data.kpis.taxAccruedEuros > 0,
    },
    {
      value: data.kpis.hoursSaved,
      label: "ore risparmiate nel mese",
      trend:
        data.kpis.guestsThisMonth > 0
          ? `stimate su ${data.kpis.guestsThisMonth} ospiti`
          : "stima sugli ospiti",
    },
  ];

  const lastCheck = data.diary.length > 0 ? data.diary[data.diary.length - 1].time : null;

  return { kicker, lines, sub, kpis, lastCheck };
}
