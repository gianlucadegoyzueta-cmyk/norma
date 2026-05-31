// ============================================================
//  Tassa di soggiorno — SCHEMA REGOLE TIPIZZATO
//
//  Sostituisce il `rules: Json` generico di TouristTaxConfig con un tipo esplicito,
//  validato in ingresso (validazione esplicita: nessuna dipendenza esterna).
//
//  Principi:
//   - denaro SEMPRE in centesimi (Int), mai float;
//   - la regola è VERSIONATA per data (validFrom/validTo nel DB): il calcolatore
//     riceve già la versione valida alla data del soggiorno;
//   - una sola regola per (comune, validFrom): tariffe diverse nel tempo = righe diverse.
// ============================================================

/** Modello di calcolo. v1: solo per-persona-per-notte (estendibile in futuro, es. PERCENTAGE). */
export type TaxModel = "PER_PERSON_PER_NIGHT";

/** Ambito del tetto notti. Il calcolatore per-soggiorno applica il tetto ALLE NOTTI DEL SOGGIORNO;
 *  l'accumulo cross-soggiorno nell'anno solare NON è calcolabile da un singolo soggiorno (serve
 *  lo storico) → è una limitazione documentata di v1, non gestita qui. */
export type NightCapScope = "CONSECUTIVE_SAME_STRUCTURE" | "PER_CALENDAR_YEAR" | "PER_STAY";

export type DeclarationPeriod = "MONTHLY" | "QUARTERLY" | "ANNUAL";

/** Canale di versamento per-comune. MANUAL_EXPORT è il default sicuro, sempre disponibile. */
export type RemittanceChannel = "MANUAL_EXPORT" | "GECOS" | "PAGOPA" | "COMUNE_PORTAL";

/** Stagione applicata a una tariffa: "ALL" = nessun aggiustamento; oppure finestre MM-DD con
 *  modificatore percentuale (es. Venezia bassa stagione -30%). Le finestre possono SCAVALCARE
 *  l'anno (from "11-01" → to "03-31"). */
export type Season =
  | "ALL"
  | {
      ranges: Array<{ from: string; to: string }>; // "MM-DD"
      modifierPct: number; // es. -30 = -30%
    };

/** Tariffa risolta per (categoria struttura, zona). Il calcolatore sceglie la più specifica. */
export interface TaxRate {
  /** Categoria struttura (es. "AFFITTO_BREVE", "CAV", "BNB"). Assente/"DEFAULT" = jolly. */
  accommodationCategory?: string;
  /** Zona del comune (Venezia usa zone reali). Assente/"DEFAULT" = jolly. */
  zone?: string;
  season: Season;
  amountCents: number;
}

/** Sovrattassa a finestra temporale (es. Giubileo Roma). Importo per-persona-per-notte. */
export interface TaxSurcharge {
  reason: string;
  amountCents: number;
  from: string; // "YYYY-MM-DD" inclusivo
  to: string; // "YYYY-MM-DD" inclusivo
}

/** Riduzione per fascia d'età: si applica se età < maxAge. reductionPct 100 = piena esenzione.
 *  Es. Venezia [{maxAge:10,reductionPct:100},{maxAge:16,reductionPct:50}]. */
export interface AgeReduction {
  maxAge: number;
  reductionPct: number; // 0..100
}

export interface RemittanceConfig {
  channel: RemittanceChannel;
  url?: string;
  notes?: string;
}

export interface DeclarationConfig {
  period: DeclarationPeriod;
  /** Entro il giorno N del periodo successivo. */
  dueDay: number;
  remittance: RemittanceConfig;
}

/** Esenzioni per categoria di ospite (oltre alle riduzioni per età). */
export interface ExemptionConfig {
  types: string[];
}

/** La regola completa di un comune per una finestra di validità. */
export interface TouristTaxRule {
  currency: "EUR";
  model: TaxModel;
  /** Tetto notti tassabili; null = nessun tetto. */
  nightCap: number | null;
  nightCapScope: NightCapScope;
  rates: TaxRate[];
  surcharges: TaxSurcharge[];
  ageReductions: AgeReduction[];
  /** Quando si valuta l'età dell'ospite. v1: sempre all'inizio del soggiorno. */
  ageEvaluatedAt: "STAY_START";
  exemptions: ExemptionConfig;
  declaration: DeclarationConfig;
}

// ----------------------------- VALIDAZIONE -----------------------------

export class TouristTaxRuleError extends Error {
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(`Regola tassa di soggiorno non valida [${path}]: ${message}`);
    this.name = "TouristTaxRuleError";
  }
}

function fail(path: string, message: string): never {
  throw new TouristTaxRuleError(message, path);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asInt(v: unknown, path: string): number {
  if (typeof v !== "number" || !Number.isInteger(v)) fail(path, "atteso intero");
  return v;
}

function asCents(v: unknown, path: string): number {
  const n = asInt(v, path);
  if (n < 0) fail(path, "importo in centesimi non può essere negativo");
  return n;
}

function asPct(v: unknown, path: string): number {
  if (typeof v !== "number" || v < 0 || v > 100) fail(path, "percentuale attesa 0..100");
  return v;
}

const MMDD = /^\d{2}-\d{2}$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

function assertMMDD(v: unknown, path: string): string {
  if (typeof v !== "string" || !MMDD.test(v)) fail(path, 'formato atteso "MM-DD"');
  const [mm, dd] = (v as string).split("-").map(Number);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) fail(path, "mese/giorno fuori range");
  return v as string;
}

function assertYMD(v: unknown, path: string): string {
  if (typeof v !== "string" || !YMD.test(v)) fail(path, 'formato atteso "YYYY-MM-DD"');
  return v as string;
}

function parseSeason(v: unknown, path: string): Season {
  if (v === "ALL") return "ALL";
  if (!isObject(v)) fail(path, '"ALL" oppure { ranges, modifierPct }');
  if (typeof v.modifierPct !== "number") fail(`${path}.modifierPct`, "numero atteso");
  if (!Array.isArray(v.ranges) || v.ranges.length === 0)
    fail(`${path}.ranges`, "almeno un intervallo");
  const ranges = v.ranges.map((r, i) => {
    if (!isObject(r)) fail(`${path}.ranges[${i}]`, "oggetto { from, to }");
    return { from: assertMMDD(r.from, `${path}.ranges[${i}].from`), to: assertMMDD(r.to, `${path}.ranges[${i}].to`) };
  });
  return { ranges, modifierPct: v.modifierPct };
}

function parseRate(v: unknown, path: string): TaxRate {
  if (!isObject(v)) fail(path, "oggetto tariffa atteso");
  const rate: TaxRate = {
    season: parseSeason(v.season ?? "ALL", `${path}.season`),
    amountCents: asCents(v.amountCents, `${path}.amountCents`),
  };
  if (v.accommodationCategory !== undefined) {
    if (typeof v.accommodationCategory !== "string") fail(`${path}.accommodationCategory`, "stringa");
    rate.accommodationCategory = v.accommodationCategory;
  }
  if (v.zone !== undefined) {
    if (typeof v.zone !== "string") fail(`${path}.zone`, "stringa");
    rate.zone = v.zone;
  }
  return rate;
}

function parseSurcharge(v: unknown, path: string): TaxSurcharge {
  if (!isObject(v)) fail(path, "oggetto sovrattassa atteso");
  if (typeof v.reason !== "string" || v.reason.length === 0) fail(`${path}.reason`, "stringa non vuota");
  return {
    reason: v.reason,
    amountCents: asCents(v.amountCents, `${path}.amountCents`),
    from: assertYMD(v.from, `${path}.from`),
    to: assertYMD(v.to, `${path}.to`),
  };
}

function parseAgeReduction(v: unknown, path: string): AgeReduction {
  if (!isObject(v)) fail(path, "oggetto { maxAge, reductionPct }");
  const maxAge = asInt(v.maxAge, `${path}.maxAge`);
  if (maxAge <= 0) fail(`${path}.maxAge`, "deve essere > 0");
  return { maxAge, reductionPct: asPct(v.reductionPct, `${path}.reductionPct`) };
}

const PERIODS: DeclarationPeriod[] = ["MONTHLY", "QUARTERLY", "ANNUAL"];
const CHANNELS: RemittanceChannel[] = ["MANUAL_EXPORT", "GECOS", "PAGOPA", "COMUNE_PORTAL"];
const SCOPES: NightCapScope[] = ["CONSECUTIVE_SAME_STRUCTURE", "PER_CALENDAR_YEAR", "PER_STAY"];

function parseDeclaration(v: unknown, path: string): DeclarationConfig {
  if (!isObject(v)) fail(path, "oggetto dichiarazione atteso");
  if (!PERIODS.includes(v.period as DeclarationPeriod)) fail(`${path}.period`, `uno di ${PERIODS.join("|")}`);
  const dueDay = asInt(v.dueDay, `${path}.dueDay`);
  if (dueDay < 1 || dueDay > 31) fail(`${path}.dueDay`, "1..31");
  if (!isObject(v.remittance)) fail(`${path}.remittance`, "oggetto atteso");
  const rem = v.remittance;
  if (!CHANNELS.includes(rem.channel as RemittanceChannel))
    fail(`${path}.remittance.channel`, `uno di ${CHANNELS.join("|")}`);
  const remittance: RemittanceConfig = { channel: rem.channel as RemittanceChannel };
  if (rem.url !== undefined) {
    if (typeof rem.url !== "string") fail(`${path}.remittance.url`, "stringa");
    remittance.url = rem.url;
  }
  if (rem.notes !== undefined) {
    if (typeof rem.notes !== "string") fail(`${path}.remittance.notes`, "stringa");
    remittance.notes = rem.notes;
  }
  return { period: v.period as DeclarationPeriod, dueDay, remittance };
}

/**
 * Valida e tipizza una regola (es. letta come JSON da TouristTaxConfig.rules).
 * Lancia TouristTaxRuleError con il path del campo errato. È la barriera che impedisce
 * a una regola malformata di produrre un calcolo silenziosamente sbagliato.
 */
export function parseTouristTaxRule(input: unknown): TouristTaxRule {
  if (!isObject(input)) fail("$", "oggetto regola atteso");
  if (input.currency !== "EUR") fail("currency", 'v1 supporta solo "EUR"');
  if (input.model !== "PER_PERSON_PER_NIGHT")
    fail("model", 'v1 supporta solo "PER_PERSON_PER_NIGHT"');

  let nightCap: number | null = null;
  if (input.nightCap !== null && input.nightCap !== undefined) {
    nightCap = asInt(input.nightCap, "nightCap");
    if (nightCap <= 0) fail("nightCap", "deve essere > 0 oppure null");
  }
  if (!SCOPES.includes(input.nightCapScope as NightCapScope))
    fail("nightCapScope", `uno di ${SCOPES.join("|")}`);

  if (!Array.isArray(input.rates) || input.rates.length === 0)
    fail("rates", "almeno una tariffa");
  const rates = input.rates.map((r, i) => parseRate(r, `rates[${i}]`));

  const surcharges = Array.isArray(input.surcharges)
    ? input.surcharges.map((s, i) => parseSurcharge(s, `surcharges[${i}]`))
    : [];

  const ageReductions = Array.isArray(input.ageReductions)
    ? input.ageReductions.map((a, i) => parseAgeReduction(a, `ageReductions[${i}]`))
    : [];

  if (input.ageEvaluatedAt !== undefined && input.ageEvaluatedAt !== "STAY_START")
    fail("ageEvaluatedAt", 'v1 supporta solo "STAY_START"');

  let exemptionTypes: string[] = [];
  if (input.exemptions !== undefined) {
    if (!isObject(input.exemptions) || !Array.isArray(input.exemptions.types))
      fail("exemptions.types", "array di stringhe");
    exemptionTypes = input.exemptions.types.map((t, i) => {
      if (typeof t !== "string") fail(`exemptions.types[${i}]`, "stringa");
      return t;
    });
  }

  return {
    currency: "EUR",
    model: "PER_PERSON_PER_NIGHT",
    nightCap,
    nightCapScope: input.nightCapScope as NightCapScope,
    rates,
    surcharges,
    ageReductions,
    ageEvaluatedAt: "STAY_START",
    exemptions: { types: exemptionTypes },
    declaration: parseDeclaration(input.declaration, "declaration"),
  };
}
