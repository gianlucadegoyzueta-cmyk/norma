// ============================================================
//  SEED REGOLE — 4 comuni ad alto volume (Roma, Firenze, Milano, Venezia)
//
//  ⚠️ SEED DI PARTENZA — DA RICONFERMARE sul regolamento comunale ufficiale prima del go-live.
//  Le tariffe cambiano (di norma al 1° gennaio o con delibera). Fonte: dataset 2026-05-31.
//  Questo file è la base sia dei TEST del calcolatore (Fase 1) sia del seed DB (Fase 2):
//  stessa forma `TouristTaxRule`, una versione per (comune, validFrom).
// ============================================================

import type { TouristTaxRule } from "../../domain/rule";

export interface ComuneSeedRule {
  comuneCode: string; // codice catastale/Alloggiati del comune
  comuneName: string;
  /** Inizio validità della versione (ISO). Le tariffe future = nuove righe con validFrom diverso. */
  validFrom: string;
  /** true se gli IMPORTI sono ancora da riconfermare sul regolamento ufficiale. */
  amountsToReconfirm: boolean;
  rule: TouristTaxRule;
}

/** Roma — Contributo di soggiorno. Affitti brevi 6 €/notte; tetto 10 notti/anno solare; esente <10.
 *  Sovrattassa Giubileo 2025 +2 €/notte. Versamento GECOS, dichiarazione trimestrale. */
export const ROMA: ComuneSeedRule = {
  comuneCode: "H501",
  comuneName: "Roma",
  validFrom: "2024-01-01",
  amountsToReconfirm: false, // 6€ verificato su comune.roma.it (classe extralberghiero)
  rule: {
    currency: "EUR",
    model: "PER_PERSON_PER_NIGHT",
    nightCap: 10,
    nightCapScope: "PER_CALENDAR_YEAR",
    rates: [{ accommodationCategory: "DEFAULT", zone: "DEFAULT", season: "ALL", amountCents: 600 }],
    surcharges: [
      { reason: "GIUBILEO_2025", amountCents: 200, from: "2025-01-01", to: "2025-12-31" },
    ],
    ageReductions: [{ maxAge: 10, reductionPct: 100 }],
    ageEvaluatedAt: "STAY_START",
    exemptions: { types: ["CAREGIVER_MAX_2", "DAY_HOSPITAL_PATIENT", "FORZE_ORDINE", "DISABILE_GRAVE_PIU_ACCOMPAGNATORE"] },
    declaration: {
      period: "QUARTERLY",
      dueDay: 16,
      remittance: { channel: "GECOS", url: "https://gecos.comune.roma.it", notes: "Dichiarazione e versamento su GECOS (trimestrale/annuale). [dueDay DA RICONFERMARE]" },
    },
  },
};

/** Firenze — 6 €/notte dal 1° feb 2025; tetto 7 notti consecutive; esente <12; dichiarazione mensile. */
export const FIRENZE: ComuneSeedRule = {
  comuneCode: "D612",
  comuneName: "Firenze",
  validFrom: "2025-02-01",
  amountsToReconfirm: false, // 6€ da delibera 535 del 10/12/2024
  rule: {
    currency: "EUR",
    model: "PER_PERSON_PER_NIGHT",
    nightCap: 7,
    nightCapScope: "CONSECUTIVE_SAME_STRUCTURE",
    rates: [{ accommodationCategory: "DEFAULT", zone: "DEFAULT", season: "ALL", amountCents: 600 }],
    surcharges: [],
    ageReductions: [{ maxAge: 12, reductionPct: 100 }],
    ageEvaluatedAt: "STAY_START",
    exemptions: { types: ["CAREGIVER_MAX_2", "DAY_HOSPITAL_PATIENT", "STUDENT_LOCAL_UNIV", "FORZE_ORDINE", "DISABILE_GRAVE_PIU_ACCOMPAGNATORE"] },
    declaration: {
      period: "MONTHLY",
      dueDay: 15,
      remittance: { channel: "COMUNE_PORTAL", url: "https://servizi.comune.fi.it", notes: "Dichiarazione mensile entro il 15 del mese successivo." },
    },
  },
};

/** Milano — 6,30 €/notte (2025); tetto 14 notti consecutive; esente <18 (soglia più alta). */
export const MILANO: ComuneSeedRule = {
  comuneCode: "F205",
  comuneName: "Milano",
  validFrom: "2025-01-01",
  amountsToReconfirm: false, // 6,30€ verificato (delibera C.C. 1388 del 07/11/2024)
  rule: {
    currency: "EUR",
    model: "PER_PERSON_PER_NIGHT",
    nightCap: 14,
    nightCapScope: "CONSECUTIVE_SAME_STRUCTURE",
    rates: [{ accommodationCategory: "DEFAULT", zone: "DEFAULT", season: "ALL", amountCents: 630 }],
    surcharges: [],
    ageReductions: [{ maxAge: 18, reductionPct: 100 }],
    ageEvaluatedAt: "STAY_START",
    exemptions: { types: ["CAREGIVER_MAX_2", "DAY_HOSPITAL_PATIENT", "FORZE_ORDINE", "DISABILE_GRAVE_PIU_ACCOMPAGNATORE"] },
    declaration: {
      period: "QUARTERLY",
      dueDay: 16,
      remittance: { channel: "COMUNE_PORTAL", url: "https://www.comune.milano.it", notes: "[periodo, dueDay e canale DA RICONFERMARE]" },
    },
  },
};

/** Venezia — per ZONA e STAGIONE; under 10 esenti + fascia 10–16 al 50%; pagoPA, trimestrale.
 *  ⚠️ IMPORTI DA RICONFERMARE: delibera C.C. 77 del 19/12/2024 (in vigore 01/04/2025) ha cambiato
 *  il regime; i valori qui sono SEGNAPOSTO strutturali, non tariffe ufficiali. */
export const VENEZIA: ComuneSeedRule = {
  comuneCode: "L736",
  comuneName: "Venezia",
  validFrom: "2025-04-01",
  amountsToReconfirm: true, // ⚠️ importi segnaposto: riverificare sul regolamento vigente
  rule: {
    currency: "EUR",
    model: "PER_PERSON_PER_NIGHT",
    nightCap: null,
    nightCapScope: "PER_STAY",
    rates: [
      // Bassa stagione −30% (nov→mar, scavalca l'anno). Importi SEGNAPOSTO [DA VERIFICARE].
      { zone: "CENTRO_STORICO", season: { ranges: [{ from: "11-01", to: "03-31" }], modifierPct: -30 }, amountCents: 500 },
      { zone: "TERRAFERMA", season: { ranges: [{ from: "11-01", to: "03-31" }], modifierPct: -30 }, amountCents: 350 },
      { zone: "DEFAULT", season: "ALL", amountCents: 400 },
    ],
    surcharges: [],
    ageReductions: [
      { maxAge: 10, reductionPct: 100 },
      { maxAge: 16, reductionPct: 50 },
    ],
    ageEvaluatedAt: "STAY_START",
    exemptions: { types: ["CAREGIVER_MAX_2", "DAY_HOSPITAL_PATIENT", "FORZE_ORDINE", "DISABILE_GRAVE_PIU_ACCOMPAGNATORE", "RESIDENTE"] },
    declaration: {
      period: "QUARTERLY",
      dueDay: 15,
      remittance: { channel: "PAGOPA", url: "https://www.comune.venezia.it", notes: "Comunicazione entro 15 gg dalla chiusura del trimestre; versamento pagoPA." },
    },
  },
};

export const SEED_COMUNI: ComuneSeedRule[] = [ROMA, FIRENZE, MILANO, VENEZIA];
