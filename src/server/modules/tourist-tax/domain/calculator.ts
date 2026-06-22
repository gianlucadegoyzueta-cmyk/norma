// ============================================================
//  Tassa di soggiorno — CALCOLATORE PURO (il cuore del modulo)
//
//  Nessun DB, nessuna rete, nessun orologio implicito: tutto entra dai parametri.
//  Denaro in centesimi (Int). Arrotondamenti espliciti (Math.round, half-up sui positivi).
//
//  Per ogni ospite → per ogni notte fino al tetto → risolve la tariffa per
//  (categoria, zona, stagione della notte) → applica esenzioni (età alla data
//  del soggiorno + flag esenzione) → somma → aggiunge le sovrattasse attive.
// ============================================================

import type { AgeReduction, Season, TaxRate, TaxSurcharge, TouristTaxRule } from "./rule";

/** Dati del soggiorno necessari al calcolo (risolti dall'adapter, qui sono puri). */
export interface StayTaxInput {
  arrivalDate: Date;
  departureDate: Date | null;
  /** Categoria della struttura (da Property). Assente = si userà la tariffa jolly. */
  accommodationCategory?: string;
  /** Zona del comune (da Property/Comune). Assente = zona jolly. */
  zone?: string;
}

/** Dati dell'ospite necessari al calcolo. */
export interface GuestTaxInput {
  id: string;
  birthDate: Date;
  /** Tipo di esenzione dichiarato (deve combaciare con rule.exemptions.types). */
  exemptionType?: string | null;
}

/** Dettaglio per singolo ospite: serve alla trasparenza e alla dichiarazione. */
export interface GuestTaxBreakdown {
  guestId: string;
  /** Notti del soggiorno (departure − arrival). */
  totalNights: number;
  /** Notti effettivamente tassate (dopo tetto ed esenzione). */
  taxedNights: number;
  exempt: boolean;
  reduced: boolean;
  /** 0..100. 100 = piena esenzione. */
  reductionPct: number;
  /** Motivo dell'esenzione/riduzione (per l'utente). null se tassazione piena. */
  reason: string | null;
  amountCents: number;
}

export interface TouristTaxResult {
  totalCents: number;
  currency: "EUR";
  guests: GuestTaxBreakdown[];
  /** Note non bloccanti (es. tetto applicato, departure mancante, accumulo annuale non gestito). */
  notes: string[];
}

export class TouristTaxRateResolutionError extends Error {
  constructor(category: string | undefined, zone: string | undefined) {
    super(
      `Nessuna tariffa applicabile per categoria="${category ?? "-"}" zona="${zone ?? "-"}" ` +
        `(serve almeno una tariffa jolly DEFAULT nella regola)`,
    );
    this.name = "TouristTaxRateResolutionError";
  }
}

/**
 * Errore di INPUT al calcolatore: dati del soggiorno o dell'ospite incoerenti (date invertite,
 * data di nascita impossibile). È una barriera: meglio fermarsi che produrre un importo assurdo.
 */
export class TouristTaxCalculationError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(`Calcolo tassa di soggiorno non possibile [${field}]: ${message}`);
    this.name = "TouristTaxCalculationError";
  }
}

const MIN_BIRTH_YEAR = 1900;
/** Tetto difensivo sull'età: oltre è certamente un errore di data, non un ospite reale. */
const MAX_PLAUSIBLE_AGE = 150;

/**
 * Valida che un ospite sia coerente con il soggiorno, per non produrre calcoli su date assurde:
 *  - data di nascita ANTERIORE all'arrivo (un ospite non può nascere dopo il check-in);
 *  - anno di nascita ≥ 1900 (sotto è quasi certamente un refuso/parsing errato);
 *  - età all'arrivo nell'intervallo [0, 150).
 * Lancia TouristTaxCalculationError con messaggio chiaro. PURA.
 */
export function validateGuestForStay(guest: GuestTaxInput, arrivalDate: Date): void {
  const birth = guest.birthDate;
  if (Number.isNaN(birth.getTime())) {
    throw new TouristTaxCalculationError(
      `data di nascita non valida per l'ospite "${guest.id}"`,
      "guest.birthDate",
    );
  }
  if (birth.getTime() >= arrivalDate.getTime()) {
    throw new TouristTaxCalculationError(
      `l'ospite "${guest.id}" risulta nato (${isoDate(birth)}) alla data di arrivo o dopo ` +
        `(${isoDate(arrivalDate)}): data di nascita impossibile`,
      "guest.birthDate",
    );
  }
  if (birth.getUTCFullYear() < MIN_BIRTH_YEAR) {
    throw new TouristTaxCalculationError(
      `anno di nascita ${birth.getUTCFullYear()} dell'ospite "${guest.id}" inferiore a ${MIN_BIRTH_YEAR}`,
      "guest.birthDate",
    );
  }
  const age = ageAtDate(birth, arrivalDate);
  if (age < 0 || age >= MAX_PLAUSIBLE_AGE) {
    throw new TouristTaxCalculationError(
      `età ${age} dell'ospite "${guest.id}" fuori dall'intervallo plausibile [0, ${MAX_PLAUSIBLE_AGE})`,
      "guest.birthDate",
    );
  }
}

const MS_PER_DAY = 86_400_000;

/** Età in anni compiuti a una data di riferimento (UTC, per evitare derive di fuso). */
export function ageAtDate(birthDate: Date, ref: Date): number {
  let age = ref.getUTCFullYear() - birthDate.getUTCFullYear();
  const m = ref.getUTCMonth() - birthDate.getUTCMonth();
  if (m < 0 || (m === 0 && ref.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

/** Numero di notti = (departure − arrival) in giorni. Mai negativo. */
export function countNights(arrival: Date, departure: Date): number {
  const days = Math.round((departure.getTime() - arrival.getTime()) / MS_PER_DAY);
  return Math.max(0, days);
}

function addDaysUTC(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}

/** "MM-DD" di una data (UTC). */
function monthDay(d: Date): string {
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

/** True se md ∈ [from,to], gestendo le finestre che scavalcano l'anno (from > to). */
function isMonthDayInRange(md: string, from: string, to: string): boolean {
  return from <= to ? md >= from && md <= to : md >= from || md <= to;
}

/** "YYYY-MM-DD" di una data (UTC). */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Sceglie la tariffa più SPECIFICA per (categoria, zona). Una tariffa è eleggibile se
 * categoria e zona sono compatibili (uguali, oppure jolly: assente/"DEFAULT"). Punteggio:
 * +2 categoria esatta, +1 zona esatta. Vince il punteggio più alto (primo a parità).
 */
function resolveRate(rates: TaxRate[], category?: string, zone?: string): TaxRate {
  const isWild = (v?: string) => v === undefined || v === "DEFAULT";
  const catOk = (r: TaxRate) =>
    isWild(r.accommodationCategory) || r.accommodationCategory === category;
  const zoneOk = (r: TaxRate) => isWild(r.zone) || r.zone === zone;

  let best: TaxRate | undefined;
  let bestScore = -1;
  for (const r of rates) {
    if (!catOk(r) || !zoneOk(r)) continue;
    const score = (r.accommodationCategory === category ? 2 : 0) + (r.zone === zone ? 1 : 0);
    if (score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  if (!best) throw new TouristTaxRateResolutionError(category, zone);
  return best;
}

/** Applica il modificatore stagionale alla tariffa base per una specifica notte. */
function applySeason(baseCents: number, season: Season, nightDate: Date): number {
  if (season === "ALL") return baseCents;
  const md = monthDay(nightDate);
  const inSeason = season.ranges.some((r) => isMonthDayInRange(md, r.from, r.to));
  if (!inSeason) return baseCents;
  return Math.round((baseCents * (100 + season.modifierPct)) / 100);
}

/** Somma delle sovrattasse attive in una data notte (per-persona-per-notte). */
function activeSurcharges(surcharges: TaxSurcharge[], nightDate: Date): number {
  const iso = isoDate(nightDate);
  return surcharges.reduce(
    (sum, s) => (iso >= s.from && iso <= s.to ? sum + s.amountCents : sum),
    0,
  );
}

/**
 * Riduzione applicabile per età: tra le fasce con età < maxAge, prende la riduzione MAGGIORE
 * (così l'ordine delle fasce nella regola non conta). 0 se nessuna fascia si applica.
 */
function reductionForAge(age: number, bands: AgeReduction[]): { pct: number; band?: AgeReduction } {
  let pct = 0;
  let band: AgeReduction | undefined;
  for (const b of bands) {
    if (age < b.maxAge && b.reductionPct > pct) {
      pct = b.reductionPct;
      band = b;
    }
  }
  return { pct, band };
}

/**
 * Calcola la tassa di soggiorno per un soggiorno. PURA.
 *
 * Regole di applicazione (documentate e testate):
 *  - età valutata all'INIZIO del soggiorno (chi compie gli anni durante il soggiorno resta
 *    nella fascia che aveva all'arrivo);
 *  - esenzione per tipo (rule.exemptions) → ospite esente al 100% (nessuna base, nessuna sovrattassa);
 *  - riduzione per età 100% → equivale a esenzione piena (nessuna base, nessuna sovrattassa);
 *  - riduzione per età parziale (es. 50%) → riduce SOLO la base; la sovrattassa (es. Giubileo) è
 *    aggiunta per intero (coerente con l'ordine "applica riduzioni, poi aggiungi surcharge");
 *  - tetto notti: applicato alle notti DEL SOGGIORNO. L'accumulo cross-soggiorno nell'anno solare
 *    (es. Roma "10 notti nell'anno") NON è calcolabile da un singolo soggiorno → vedi `notes`.
 */
export function computeTouristTax(
  stay: StayTaxInput,
  guests: GuestTaxInput[],
  rule: TouristTaxRule,
): TouristTaxResult {
  const notes: string[] = [];

  if (!stay.departureDate) {
    return {
      totalCents: 0,
      currency: "EUR",
      guests: guests.map((g) => ({
        guestId: g.id,
        totalNights: 0,
        taxedNights: 0,
        exempt: false,
        reduced: false,
        reductionPct: 0,
        reason: "data di partenza mancante: stima non disponibile",
        amountCents: 0,
      })),
      notes: ["Data di partenza mancante: impossibile stimare la tassa."],
    };
  }

  // Date invertite: con una partenza nota PRIMA dell'arrivo il soggiorno non esiste.
  // countNights le clamperebbe a 0 nascondendo l'errore: meglio fermarsi esplicitamente.
  if (stay.departureDate.getTime() < stay.arrivalDate.getTime()) {
    throw new TouristTaxCalculationError(
      `data di partenza (${isoDate(stay.departureDate)}) anteriore all'arrivo ` +
        `(${isoDate(stay.arrivalDate)})`,
      "stay.departureDate",
    );
  }

  const totalNights = countNights(stay.arrivalDate, stay.departureDate);
  const billableNights =
    rule.nightCap === null ? totalNights : Math.min(totalNights, rule.nightCap);
  if (rule.nightCap !== null && totalNights > rule.nightCap) {
    notes.push(`Tetto di ${rule.nightCap} notti applicato (soggiorno di ${totalNights} notti).`);
  }
  if (
    rule.nightCap !== null &&
    (rule.nightCapScope === "PER_CALENDAR_YEAR" ||
      rule.nightCapScope === "CONSECUTIVE_SAME_STRUCTURE")
  ) {
    notes.push(
      "Il tetto è calcolato sulle notti di QUESTO soggiorno: l'accumulo su più soggiorni " +
        "nell'anno solare richiede lo storico e non è incluso in questa stima.",
    );
  }

  const rate = resolveRate(rule.rates, stay.accommodationCategory, stay.zone);

  const breakdowns: GuestTaxBreakdown[] = guests.map((g) => {
    validateGuestForStay(g, stay.arrivalDate);
    const exemptByType = !!g.exemptionType && rule.exemptions.types.includes(g.exemptionType);
    const age = ageAtDate(g.birthDate, stay.arrivalDate);
    const { pct: agePct, band } = reductionForAge(age, rule.ageReductions);
    const reductionPct = exemptByType ? 100 : agePct;
    const fullyExempt = reductionPct >= 100;

    let amountCents = 0;
    let taxedNights = 0;
    if (!fullyExempt) {
      for (let i = 0; i < billableNights; i += 1) {
        const nightDate = addDaysUTC(stay.arrivalDate, i);
        const seasoned = applySeason(rate.amountCents, rate.season, nightDate);
        const reducedBase = Math.round((seasoned * (100 - reductionPct)) / 100);
        const surcharge = activeSurcharges(rule.surcharges, nightDate);
        amountCents += reducedBase + surcharge;
      }
      taxedNights = billableNights;
    }

    let reason: string | null = null;
    if (exemptByType) reason = `esente: ${g.exemptionType}`;
    else if (fullyExempt) reason = `minore esente (età ${age} < ${band?.maxAge} anni)`;
    else if (reductionPct > 0)
      reason = `riduzione età ${reductionPct}% (età ${age} < ${band?.maxAge} anni)`;

    return {
      guestId: g.id,
      totalNights,
      taxedNights,
      exempt: fullyExempt,
      reduced: reductionPct > 0 && reductionPct < 100,
      reductionPct,
      reason,
      amountCents,
    };
  });

  const totalCents = breakdowns.reduce((s, b) => s + b.amountCents, 0);
  return { totalCents, currency: "EUR", guests: breakdowns, notes };
}
