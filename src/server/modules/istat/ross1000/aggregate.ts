// AGGREGAZIONE del movimento mensile. PURA: soggiorni → giorni di movimento (arrivi/partenze + struttura).
//
// Regole (dal tracciato Ross1000):
//  - ARRIVI di un giorno = check-in con data di arrivo in quel giorno;
//  - PARTENZE di un giorno = check-out con data di partenza in quel giorno (usa departureDate → "punto 4");
//  - un soggiorno può contribuire la PARTENZA in questo mese anche se l'ARRIVO era in un mese precedente
//    (e viceversa): arrivi e partenze si valutano indipendentemente contro la finestra del periodo;
//  - ogni giorno del mese genera un <movimento> con <struttura>; un giorno senza arrivi/partenze è un
//    "movimento zero" valido (struttura presente, niente ospiti).
//
// OCCUPAZIONE — assunzione documentata: `camereoccupate` del giorno = numero di soggiorni ATTIVI quella
// notte (arrivo ≤ giorno < partenza), cap a `camereDisponibili`. Vale "1 soggiorno = 1 unità", coerente
// con gli affitti brevi (una prenotazione = un alloggio). Se in futuro un soggiorno occupa più camere,
// va introdotto un conteggio camere per soggiorno.

import { daysOfPeriod, periodBounds } from "./period";
import type { ArrivoInput, GiornoMovimento, PartenzaInput, StrutturaGiorno } from "./tracciato-xml";

/** Soggiorno con i suoi ospiti già risolti come ArrivoInput (idswh per ospite, codici risolti). */
export interface AggregateStay {
  stayId: string;
  arrivalDate: Date;
  departureDate: Date | null;
  /** Ospiti del soggiorno, già pronti per il tracciato (vedi resolver a monte). */
  guests: ArrivoInput[];
}

export interface AggregateInput {
  period: string; // "YYYY-MM"
  /** Capacità della struttura nel mese (camere/letti disponibili). */
  capacity: { camereDisponibili: number; lettiDisponibili: number };
  /** Giorni in cui la struttura è CHIUSA (ISO "YYYY-MM-DD"). Default: sempre aperta. */
  closedDays?: readonly string[];
  stays: readonly AggregateStay[];
}

export interface AggregateResult {
  giorni: GiornoMovimento[];
  arriviTotali: number;
  partenzeTotali: number;
  /** Notti-soggiorno nel mese (somma occupazione giornaliera): proxy delle "presenze". */
  presenze: number;
}

function isoDay(d: Date): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/** Costruisce i giorni di movimento del periodo da soggiorni+ospiti. */
export function computeMovimenti(input: AggregateInput): AggregateResult {
  const { start, end } = periodBounds(input.period);
  const closed = new Set(input.closedDays ?? []);
  const allDays = daysOfPeriod(input.period);

  // Indici per giorno → arrivi / partenze.
  const arriviByDay = new Map<string, ArrivoInput[]>();
  const partenzeByDay = new Map<string, PartenzaInput[]>();
  let arriviTotali = 0;
  let partenzeTotali = 0;

  for (const stay of input.stays) {
    const arrivalIso = isoDay(stay.arrivalDate);
    // ARRIVI: solo se la data di arrivo cade nel mese.
    if (stay.arrivalDate >= start && stay.arrivalDate < end) {
      const list = arriviByDay.get(arrivalIso) ?? [];
      list.push(...stay.guests);
      arriviByDay.set(arrivalIso, list);
      arriviTotali += stay.guests.length;
    }
    // PARTENZE: solo se la data di partenza cade nel mese.
    if (stay.departureDate && stay.departureDate >= start && stay.departureDate < end) {
      const depIso = isoDay(stay.departureDate);
      const list = partenzeByDay.get(depIso) ?? [];
      for (const g of stay.guests) {
        list.push({ idswh: g.idswh, tipoAlloggiato: g.tipoAlloggiato, dataArrivo: arrivalIso });
      }
      partenzeByDay.set(depIso, list);
      partenzeTotali += stay.guests.length;
    }
  }

  // Occupazione: per ogni giorno, soggiorni attivi quella notte (arrivo ≤ giorno < partenza).
  const occupiedOn = (dayIso: string): number => {
    const dayStart = new Date(`${dayIso}T00:00:00.000Z`);
    let n = 0;
    for (const stay of input.stays) {
      const arr = new Date(
        Date.UTC(
          stay.arrivalDate.getUTCFullYear(),
          stay.arrivalDate.getUTCMonth(),
          stay.arrivalDate.getUTCDate(),
        ),
      );
      const dep = stay.departureDate
        ? new Date(
            Date.UTC(
              stay.departureDate.getUTCFullYear(),
              stay.departureDate.getUTCMonth(),
              stay.departureDate.getUTCDate(),
            ),
          )
        : null;
      if (arr <= dayStart && (dep === null || dayStart < dep)) n += 1;
    }
    return n;
  };

  let presenze = 0;
  const giorni: GiornoMovimento[] = allDays.map((dayIso) => {
    const aperta = !closed.has(dayIso);
    const occupate = aperta ? Math.min(occupiedOn(dayIso), input.capacity.camereDisponibili) : 0;
    presenze += occupate;
    const struttura: StrutturaGiorno = {
      aperta,
      camereOccupate: occupate,
      camereDisponibili: input.capacity.camereDisponibili,
      lettiDisponibili: input.capacity.lettiDisponibili,
    };
    return {
      data: dayIso,
      struttura,
      arrivi: arriviByDay.get(dayIso) ?? [],
      partenze: partenzeByDay.get(dayIso) ?? [],
    };
  });

  return { giorni, arriviTotali, partenzeTotali, presenze };
}
