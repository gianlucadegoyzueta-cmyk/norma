// AGGREGAZIONE del movimento Umbria (Turismatica C59). PURA: soggiorni → un file per giorno del periodo.
//
// Per ogni giorno D produce un UmbriaGiornoFile:
//  - presentiNottePrecedente = persone presenti la notte D−1 (soggiorni attivi: arrivo ≤ D−1 < partenza);
//  - arrivati = persone arrivate il giorno D · partiti = persone partite il giorno D;
//  - camereOccupate = soggiorni attivi la notte D (cap alla capacità);
//  - provenienze = righe aggregate per codice provenienza (arrivi/partiti del giorno).
// Identità garantita: Totale (=prec+arrivati) − Partiti = presenti notte D (vedi tracciato).
//
// Le provenienze sono GIÀ risolte a monte (report.ts) in {code, descrizione}; qui si contano soltanto.

import { daysOfPeriod, periodBounds } from "../ross1000/period";
import type { UmbriaGiornoFile, UmbriaProvenienzaRiga } from "./tracciato";

/** Ospite già risolto: provenienza Turismatica (sigla provincia o codice estero) + descrizione. */
export interface UmbriaGuest {
  provenienzaCode: string;
  provenienzaDescrizione: string;
}

export interface UmbriaAggregateStay {
  arrivalDate: Date;
  departureDate: Date | null;
  guests: UmbriaGuest[];
}

export interface UmbriaAggregateInput {
  period: string; // "YYYY-MM"
  denominazione: string;
  capacity: { camereDisponibili: number };
  /** Giorni in cui la struttura è CHIUSA (ISO). Default: sempre aperta. */
  closedDays?: readonly string[];
  stays: readonly UmbriaAggregateStay[];
}

export interface UmbriaAggregateResult {
  /** Un file per giorno del periodo (in ordine). */
  files: UmbriaGiornoFile[];
  arriviTotali: number;
  partenzeTotali: number;
  presenze: number;
}

function isoDay(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function previousDayIso(dayIso: string): string {
  const d = new Date(`${dayIso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function computeUmbriaC59(input: UmbriaAggregateInput): UmbriaAggregateResult {
  const { start, end } = periodBounds(input.period);
  const closed = new Set(input.closedDays ?? []);
  const allDays = daysOfPeriod(input.period);

  const arrivalsByDay = new Map<string, UmbriaGuest[]>();
  const departuresByDay = new Map<string, UmbriaGuest[]>();
  let arriviTotali = 0;
  let partenzeTotali = 0;

  for (const stay of input.stays) {
    if (stay.arrivalDate >= start && stay.arrivalDate < end) {
      const iso = isoDay(stay.arrivalDate);
      arrivalsByDay.set(iso, [...(arrivalsByDay.get(iso) ?? []), ...stay.guests]);
      arriviTotali += stay.guests.length;
    }
    if (stay.departureDate && stay.departureDate >= start && stay.departureDate < end) {
      const iso = isoDay(stay.departureDate);
      departuresByDay.set(iso, [...(departuresByDay.get(iso) ?? []), ...stay.guests]);
      partenzeTotali += stay.guests.length;
    }
  }

  // Presenze della notte (arrivo ≤ giorno < partenza): persone e camere (soggiorni).
  const nightOf = (dayIso: string): { rooms: number; persons: number } => {
    const day = new Date(`${dayIso}T00:00:00.000Z`);
    let rooms = 0;
    let persons = 0;
    for (const stay of input.stays) {
      const arr = new Date(`${isoDay(stay.arrivalDate)}T00:00:00.000Z`);
      const dep = stay.departureDate
        ? new Date(`${isoDay(stay.departureDate)}T00:00:00.000Z`)
        : null;
      if (arr <= day && (dep === null || day < dep)) {
        rooms += 1;
        persons += stay.guests.length;
      }
    }
    return { rooms, persons };
  };

  /** Righe provenienza del giorno: conta arrivi e partiti per codice. */
  const provenienzeOf = (dayIso: string): UmbriaProvenienzaRiga[] => {
    const map = new Map<string, UmbriaProvenienzaRiga>();
    const bump = (g: UmbriaGuest, field: "arrivati" | "partiti"): void => {
      const row = map.get(g.provenienzaCode) ?? {
        code: g.provenienzaCode,
        descrizione: g.provenienzaDescrizione,
        arrivati: 0,
        partiti: 0,
      };
      row[field] += 1;
      map.set(g.provenienzaCode, row);
    };
    for (const g of arrivalsByDay.get(dayIso) ?? []) bump(g, "arrivati");
    for (const g of departuresByDay.get(dayIso) ?? []) bump(g, "partiti");
    // Ordine deterministico per codice (l'importer legge la colonna, l'ordine è indifferente).
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  };

  let presenze = 0;
  const files: UmbriaGiornoFile[] = allDays.map((dayIso): UmbriaGiornoFile => {
    const night = nightOf(dayIso);
    presenze += night.persons;
    const aperta = !closed.has(dayIso);
    const arrivati = (arrivalsByDay.get(dayIso) ?? []).length;
    const partiti = (departuresByDay.get(dayIso) ?? []).length;
    return {
      denominazione: input.denominazione,
      data: dayIso,
      presentiNottePrecedente: nightOf(previousDayIso(dayIso)).persons,
      arrivati,
      partiti,
      camereOccupate: aperta ? Math.min(night.rooms, input.capacity.camereDisponibili) : 0,
      provenienze: provenienzeOf(dayIso),
    };
  });

  return { files, arriviTotali, partenzeTotali, presenze };
}
