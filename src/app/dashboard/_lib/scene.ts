import type { HeroSegment } from "@/components/dashboard/concierge-hero";
import type { KpiSpec } from "@/components/dashboard/concierge-kpis";
import { type DashboardData, type DashboardProposal } from "./data";

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
  // "Posizione regolare" = nessuna scadenza superata E nulla in attesa di conferma. Con schedine
  // PENDING/UNVERIFIED l'obbligo non è ancora assolto: lo stato resta "in lavorazione", non "regolare".
  const pending = data.kpis.pendingSchedine;
  const allClear = data.positionRegular && pending === 0;

  // --- Hero ASCIUTTO (dual-judge, consenso alto): saluto serif a UNA riga + una sotto-riga
  // di stato sans. Le decisioni NON si raccontano qui — vivono nel blocco "Aspettano il tuo
  // via libera" sotto (regola anti-ridondanza: un fatto, un posto solo). La ricevuta Questura
  // vive nel diario "Fatto stanotte", non in cima. Niente parola rotante.
  const greeting = greetingFor(now);
  const lines: HeroSegment[][] = [
    [{ text: firstName ? `${greeting} ${firstName}.` : `${greeting}.` }],
  ];

  const noun = things === 1 ? "cosa" : "cose";
  // "X da confermare" è VERO anche quando nulla è scaduto: non confonde "preparato" con "adempiuto".
  const pendingNote =
    pending > 0
      ? ` ${pending} ${pending === 1 ? "schedina è" : "schedine sono"} in attesa della tua conferma.`
      : "";
  const sub: { text: string; bold?: string } =
    things > 0
      ? {
          bold: `Stanotte ho preparato ${things} ${noun}.`,
          text:
            pending > 0
              ? pendingNote
              : k > 0
                ? " Niente è scaduto: aspetto il tuo via libera."
                : " Per oggi non serve altro.",
        }
      : pending > 0
        ? { bold: "Tutto pronto.", text: pendingNote }
        : k > 0
          ? { bold: "Tutto pronto.", text: " Niente è scaduto: aspetto solo il tuo via libera." }
          : allClear
            ? { bold: "Tutto in regola.", text: " Nessuna scadenza da gestire oggi." }
            : {
                bold: "Nessuna scadenza scaduta.",
                text: " Resta solo da confermare il preparato.",
              };

  const positionLabel = !data.positionRegular
    ? "da sistemare"
    : pending > 0
      ? `${pending} da confermare`
      : "regolare";
  const kicker = `${new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: ROME_TZ,
  }).format(now)} · posizione ${positionLabel}`;

  const monthName = new Intl.DateTimeFormat("it-IT", { month: "long", timeZone: ROME_TZ }).format(
    now,
  );
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;
  const quarterLabel = QUARTER_LABEL[quarter];
  const { guestsThisMonth } = data.kpis;
  const tax = data.kpis.taxAccruedEuros;
  const overdue = data.overdueSchedine;
  const istat = data.istat;

  // I 4 KPI guidano con i DUE PILASTRI (Alloggiati, Turismo/ISTAT). La tassa è secondaria, gli
  // ospiti sono l'input che li alimenta. Occupazione e ore-risparmiate non sono più in cima
  // (restano calcolate in data.ts per usi futuri): la dashboard parla di adempimento, non di ricettività.
  const kpis: KpiSpec[] = [
    // PILASTRO 1 — Alloggiati: l'azione del giorno.
    {
      value: pending,
      label: "schedine da confermare",
      trend:
        overdue > 0
          ? `${overdue} oltre scadenza`
          : pending > 0
            ? "pronte, aspettano il tuo via libera"
            : "nessuna in attesa",
      due: overdue > 0,
      detail: {
        title: "Schedine da confermare",
        intro:
          pending > 0
            ? `${pending} ${pending === 1 ? "schedina preparata" : "schedine preparate"} in attesa della tua conferma.`
            : "Nessuna schedina in attesa: l'outbox è pulito.",
        rows: [
          { label: "In attesa di conferma", value: `${pending}` },
          { label: "Di cui oltre scadenza", value: `${overdue}` },
        ],
        note: "Norma le prepara dai dati degli ospiti; l'invio ad Alloggiati resta una tua conferma.",
        link: { label: "Vai alle schedine", href: "/schedine" },
      },
    },
    // PILASTRO 2 — Turismo/ISTAT: prontezza del movimento del mese.
    {
      value: istat.ready,
      label: `movimento ISTAT · ${istat.monthLabel}`,
      trend:
        istat.total === 0
          ? "nessuna struttura"
          : istat.ready === istat.total
            ? "tutte pronte"
            : `${istat.ready}/${istat.total} pronte`,
      detail: {
        title: `Movimento ISTAT · ${istat.monthLabel}`,
        intro:
          istat.total === 0
            ? "Aggiungi una struttura per preparare il movimento turistico."
            : `${istat.ready} ${istat.ready === 1 ? "struttura pronta" : "strutture pronte"} all'invio su ${istat.total}.`,
        rows: [
          { label: "Pronte", value: `${istat.ready}` },
          { label: "Da completare", value: `${istat.incomplete}` },
          { label: "Inserimento manuale", value: `${istat.assisted}` },
          ...(istat.unrouted > 0
            ? [{ label: "Regione da verificare", value: `${istat.unrouted}` }]
            : []),
        ],
        note: "Norma prepara il tracciato della regione; dove manca un dato te lo segnala, mai inventato.",
        link: { label: "Apri il movimento ISTAT", href: "/istat" },
      },
    },
    // Turismo — secondaria: la tassa di soggiorno.
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
    // Input ai due pilastri: gli ospiti registrati nel mese.
    {
      value: guestsThisMonth,
      label: `ospiti registrati · ${monthName}`,
      trend:
        guestsThisMonth === 0
          ? "nessuno questo mese"
          : pending > 0
            ? `${pending} ${pending === 1 ? "schedina" : "schedine"} da confermare`
            : data.positionRegular
              ? "schedine in regola"
              : "schedine da gestire",
      detail: {
        title: `Ospiti registrati · ${monthName}`,
        intro:
          guestsThisMonth > 0
            ? `${guestsThisMonth} ${guestsThisMonth === 1 ? "ospite registrato" : "ospiti registrati"} questo mese.`
            : "Ancora nessun ospite registrato questo mese.",
        rows: [
          { label: "Ospiti nel mese", value: `${guestsThisMonth}` },
          {
            label: "Stato schedine",
            value:
              guestsThisMonth === 0
                ? "—"
                : pending > 0
                  ? `${pending} da confermare`
                  : data.positionRegular
                    ? "tutte in regola"
                    : "da gestire",
          },
        ],
        note: "Ogni ospite registrato diventa una schedina pronta per Alloggiati Web.",
        link: { label: "Vai ai soggiorni", href: "/stays" },
      },
    },
  ];

  const lastCheck = data.diary.length > 0 ? data.diary[data.diary.length - 1].time : null;

  return { kicker, lines, sub, kpis, lastCheck };
}
