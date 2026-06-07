// Dominio ISTAT — aggregazione mensile del movimento turistico. PURO: dati in → report out,
// niente DB, niente rete. Calcola ARRIVI (check-in nel mese) e PRESENZE (notti trascorse nel mese)
// per PROVENIENZA dell'ospite. La provenienza è la RESIDENZA: per i residenti esteri lo Stato, per
// i residenti in Italia la provincia (le rilevazioni regionali poi sommano a livello di regione).
//
// Le date arrivo/partenza sono giorni di calendario (memorizzate a mezzogiorno UTC): qui le si
// riduce al giorno UTC. Una notte "appartiene" alla sua data: un soggiorno 30/05→02/06 ha 2 notti a
// maggio (30,31) e 1 a giugno (01). Le presenze del mese = notti la cui data cade nel mese.

/** Provenienza dell'ospite, derivata dalla residenza. */
export type Provenance =
  | { kind: "ESTERO"; countryCode: string; countryName: string }
  | { kind: "ITALIA"; provincia: string }; // sigla provincia di residenza (es. "RM")

/** Un soggiorno-ospite da conteggiare (già risolto: niente id di lookup nel dominio). */
export interface IstatStayRecord {
  arrival: Date;
  /** null = soggiorno ancora in corso → presente fino a fine mese ai fini del report. */
  departure: Date | null;
  provenance: Provenance;
}

export interface IstatRow {
  provenance: Provenance;
  label: string; // etichetta leggibile (Stato o sigla provincia)
  arrivi: number; // arrivi (check-in) nel mese
  presenze: number; // notti trascorse nel mese
}

export interface IstatMonthlyReport {
  period: string; // "YYYY-MM"
  rows: IstatRow[]; // una per provenienza, ordinate per presenze desc
  totals: { arrivi: number; presenze: number };
}

const MS_PER_DAY = 86_400_000;
const PERIOD_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Giorno di calendario (UTC) come intero di giorni dall'epoch — robusto al fuso (date a mezzogiorno UTC). */
function utcDay(d: Date): number {
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / MS_PER_DAY);
}

function provenanceKey(p: Provenance): string {
  return p.kind === "ESTERO" ? `E:${p.countryCode}` : `I:${p.provincia}`;
}

function provenanceLabel(p: Provenance): string {
  return p.kind === "ESTERO" ? p.countryName : p.provincia;
}

/**
 * Aggrega un mese ("YYYY-MM"). Per ogni record: +1 arrivo se l'arrivo cade nel mese; presenze =
 * notti dell'intervallo [arrivo, partenza) intersecato col mese. Deterministico.
 */
export function aggregateMonth(period: string, records: IstatStayRecord[]): IstatMonthlyReport {
  const m = PERIOD_RE.exec(period);
  if (!m) throw new Error(`Periodo ISTAT non valido (atteso YYYY-MM): ${period}`);
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12

  const monthStart = Math.floor(Date.UTC(year, month - 1, 1) / MS_PER_DAY);
  const monthEnd = Math.floor(Date.UTC(year, month, 1) / MS_PER_DAY); // primo giorno del mese dopo (esclusivo)

  const byKey = new Map<string, IstatRow>();

  for (const r of records) {
    const aDay = utcDay(r.arrival);
    const dDay = r.departure ? utcDay(r.departure) : monthEnd; // in corso → presente fino a fine mese

    const isArrival = aDay >= monthStart && aDay < monthEnd ? 1 : 0;
    const overlapStart = Math.max(aDay, monthStart);
    const overlapEnd = Math.min(dDay, monthEnd);
    const nights = Math.max(0, overlapEnd - overlapStart);

    if (isArrival === 0 && nights === 0) continue; // niente da contare in questo mese

    const key = provenanceKey(r.provenance);
    const row = byKey.get(key) ?? {
      provenance: r.provenance,
      label: provenanceLabel(r.provenance),
      arrivi: 0,
      presenze: 0,
    };
    row.arrivi += isArrival;
    row.presenze += nights;
    byKey.set(key, row);
  }

  const rows = [...byKey.values()].sort(
    (a, b) => b.presenze - a.presenze || b.arrivi - a.arrivi || a.label.localeCompare(b.label),
  );
  const totals = rows.reduce(
    (t, r) => ({ arrivi: t.arrivi + r.arrivi, presenze: t.presenze + r.presenze }),
    { arrivi: 0, presenze: 0 },
  );

  return { period, rows, totals };
}
