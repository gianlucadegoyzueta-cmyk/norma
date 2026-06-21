// AGGREGAZIONE del movimento mensile per il tracciato SPOT (Puglia). PURA: soggiorni → giorni SPOT.
//
// Per ogni giorno del periodo produce un SpotGiorno:
//  - ARRIVI: i soggiorni con arrivo quel giorno, ogni soggiorno raggruppato in arrivo/i a livello capo
//    (ospite singolo o capo) con i membri 19/20 ANNIDATI in <componenti> sotto il proprio capo;
//  - PARTENZE: i codici (codiceclientesr) dei capi/singoli dei soggiorni con partenza quel giorno
//    (i membri seguono il capo, regola 10);
//  - STATO: EC se chiuso · MP se ci sono arrivi o partenze · NM altrimenti (regole 3/4/13);
//  - DATI STRUTTURA: solo nei giorni MP (camere/letti disponibili + camere occupate).
//
// Modello affitti brevi: 1 soggiorno = 1 unità (camera) occupata. Le presenze (notti-persona) e
// l'occupazione camere si calcolano sui soggiorni attivi la notte (arrivo ≤ giorno < partenza).
// dayuse: arrivo e partenza nello stesso giorno (regola 8) → non occupa la notte.

import type { Sex, TipoAlloggiato } from "@prisma/client";
import { daysOfPeriod, periodBounds } from "../ross1000/period";
import type { SpotArrivo, SpotComponente, SpotGiorno, SpotResidenza } from "./tracciato-xml";

export class SpotAggregateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpotAggregateError";
  }
}

/** Ospite già risolto per SPOT (codici AlloggiatiWeb risolti, età calcolata a monte). */
export interface SpotGuest {
  codiceClienteSr: string;
  tipoAlloggiato: TipoAlloggiato;
  /** codiceclientesr del capo, valorizzato per i membri (19/20). */
  leaderCodice?: string;
  sesso: Sex;
  cittadinanzaCode: string;
  residenza: SpotResidenza;
  occupaPostoLetto: boolean;
  eta: number;
}

export interface SpotAggregateStay {
  stayId: string;
  arrivalDate: Date;
  departureDate: Date | null;
  guests: SpotGuest[];
}

export interface SpotAggregateInput {
  period: string; // "YYYY-MM"
  capacity: { camereDisponibili: number; lettiDisponibili: number };
  /** Giorni in cui la struttura è CHIUSA (ISO "YYYY-MM-DD"). Default: sempre aperta. */
  closedDays?: readonly string[];
  stays: readonly SpotAggregateStay[];
}

export interface SpotAggregateResult {
  giorni: SpotGiorno[];
  arriviTotali: number; // persone arrivate nel periodo
  partenzeTotali: number; // persone partite nel periodo
  presenze: number; // notti-persona nel periodo
}

const LEAD_TIPI = new Set<TipoAlloggiato>(["OSPITE_SINGOLO", "CAPO_FAMIGLIA", "CAPO_GRUPPO"]);
const isLead = (t: TipoAlloggiato): boolean => LEAD_TIPI.has(t);

function isoDay(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/** Membro (19/20) → componente del tracciato. */
function toComponente(g: SpotGuest): SpotComponente {
  return {
    codiceClienteSr: g.codiceClienteSr,
    sesso: g.sesso,
    cittadinanzaCode: g.cittadinanzaCode,
    residenza: g.residenza,
    occupaPostoLetto: g.occupaPostoLetto,
    eta: g.eta,
  };
}

/** Trasforma gli ospiti di UN soggiorno in arrivo/i SPOT (capo con componenti annidati). */
function arriviForStay(guests: readonly SpotGuest[], dayUse: boolean): SpotArrivo[] {
  const leads = guests.filter((g) => isLead(g.tipoAlloggiato));
  const members = guests.filter((g) => !isLead(g.tipoAlloggiato));

  if (leads.length === 0) {
    throw new SpotAggregateError(
      "Soggiorno senza ospite capo/singolo (16/17/18): impossibile costruire l'arrivo SPOT.",
    );
  }

  const assigned = new Set<string>();
  const arrivi = leads.map((lead): SpotArrivo => {
    const isCapo = lead.tipoAlloggiato !== "OSPITE_SINGOLO";
    let componenti: SpotComponente[] | undefined;
    if (isCapo) {
      const mine =
        leads.length === 1
          ? members // un solo capo: tutti i membri sono suoi
          : members.filter((m) => m.leaderCodice === lead.codiceClienteSr);
      mine.forEach((m) => assigned.add(m.codiceClienteSr));
      componenti = mine.map(toComponente);
    }
    return {
      codiceClienteSr: lead.codiceClienteSr,
      sesso: lead.sesso,
      cittadinanzaCode: lead.cittadinanzaCode,
      residenza: lead.residenza,
      occupaPostoLetto: lead.occupaPostoLetto,
      dayUse,
      tipologia: lead.tipoAlloggiato,
      eta: lead.eta,
      componenti,
    };
  });

  // Membri orfani (nessun capo corrispondente) → dato incoerente, non inventiamo l'aggancio.
  const orphans = members.filter((m) => !assigned.has(m.codiceClienteSr));
  if (orphans.length > 0) {
    throw new SpotAggregateError(
      `Membri senza capo corrispondente nel soggiorno: ${orphans.map((o) => o.codiceClienteSr).join(", ")}.`,
    );
  }
  return arrivi;
}

/** Codici dei capi/singoli del soggiorno (per le partenze; i membri seguono il capo). */
function partenzaCodes(guests: readonly SpotGuest[]): string[] {
  return guests.filter((g) => isLead(g.tipoAlloggiato)).map((g) => g.codiceClienteSr);
}

export function computeSpotMovimenti(input: SpotAggregateInput): SpotAggregateResult {
  const { start, end } = periodBounds(input.period);
  const closed = new Set(input.closedDays ?? []);
  const allDays = daysOfPeriod(input.period);

  const dayUseOf = (s: SpotAggregateStay): boolean =>
    s.departureDate != null && isoDay(s.arrivalDate) === isoDay(s.departureDate);

  // Indici giorno → soggiorni in arrivo / partenza.
  const arrivalsByDay = new Map<string, SpotAggregateStay[]>();
  const departuresByDay = new Map<string, SpotAggregateStay[]>();
  let arriviTotali = 0;
  let partenzeTotali = 0;

  for (const stay of input.stays) {
    if (stay.arrivalDate >= start && stay.arrivalDate < end) {
      const iso = isoDay(stay.arrivalDate);
      const list = arrivalsByDay.get(iso) ?? [];
      list.push(stay);
      arrivalsByDay.set(iso, list);
      arriviTotali += stay.guests.length;
    }
    if (stay.departureDate && stay.departureDate >= start && stay.departureDate < end) {
      const iso = isoDay(stay.departureDate);
      const list = departuresByDay.get(iso) ?? [];
      list.push(stay);
      departuresByDay.set(iso, list);
      partenzeTotali += stay.guests.length;
    }
  }

  // Occupazione della notte: soggiorni attivi (arrivo ≤ giorno < partenza) → camere; ospiti → presenze.
  const activeOn = (dayIso: string): { rooms: number; persons: number } => {
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

  let presenze = 0;
  const giorni: SpotGiorno[] = allDays.map((dayIso): SpotGiorno => {
    const { rooms, persons } = activeOn(dayIso);

    if (closed.has(dayIso)) {
      // Giorno chiuso (EC): nessuna presenza dichiarata, niente datistruttura.
      return { data: dayIso, stato: "EC" };
    }
    presenze += persons;

    const arrivalStays = arrivalsByDay.get(dayIso) ?? [];
    const departureStays = departuresByDay.get(dayIso) ?? [];
    const arrivi = arrivalStays.flatMap((s) => arriviForStay(s.guests, dayUseOf(s)));
    const partenze = departureStays.flatMap((s) => partenzaCodes(s.guests));

    if (arrivi.length === 0 && partenze.length === 0) {
      return { data: dayIso, stato: "NM" };
    }

    return {
      data: dayIso,
      stato: "MP",
      arrivi,
      partenze,
      datiStruttura: {
        camereDisponibili: input.capacity.camereDisponibili,
        postiLettoDisponibili: input.capacity.lettiDisponibili,
        camereOccupate: Math.min(rooms, input.capacity.camereDisponibili),
      },
    };
  });

  return { giorni, arriviTotali, partenzeTotali, presenze };
}
