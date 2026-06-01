// ============================================================
//  SEED REGOLE — 4 comuni ad alto volume (Roma, Firenze, Milano, Venezia)
//
//  ⚠️ SEED DI PARTENZA — DA RICONFERMARE sul regolamento comunale ufficiale prima del go-live.
//  Le tariffe cambiano (di norma al 1° gennaio o con delibera). Fonte: dataset 2026-05-31.
//  Stessa forma `TouristTaxRule`: usato sia dai test del calcolatore sia dallo script di seed DB.
//  `amountsToReconfirm` marca le regole i cui IMPORTI non sono ancora verificati sull'ufficiale.
// ============================================================

import type { TouristTaxRule } from "./rule";

export interface ComuneSeedRule {
  comuneCode: string; // codice catastale/Alloggiati del comune (match su Comune.code)
  comuneName: string;
  validFrom: string; // ISO; nuove tariffe = nuove righe con validFrom diverso
  validTo: string | null;
  amountsToReconfirm: boolean;
  rule: TouristTaxRule;
}

/** Roma — Contributo di soggiorno. 6 €/notte; tetto 10 notti/anno solare; esente <10; Giubileo +2€. */
export const ROMA: ComuneSeedRule = {
  comuneCode: "H501",
  comuneName: "Roma",
  validFrom: "2024-01-01",
  validTo: null,
  amountsToReconfirm: false,
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
    exemptions: {
      types: [
        "CAREGIVER_MAX_2",
        "DAY_HOSPITAL_PATIENT",
        "FORZE_ORDINE",
        "DISABILE_GRAVE_PIU_ACCOMPAGNATORE",
      ],
    },
    declaration: {
      period: "QUARTERLY",
      dueDay: 16,
      remittance: {
        channel: "GECOS",
        url: "https://gecos.comune.roma.it",
        notes:
          "Dichiarazione e versamento su GECOS (trimestrale/annuale). [dueDay DA RICONFERMARE]",
      },
    },
  },
};

/** Firenze — 6 €/notte dal 1° feb 2025; tetto 7 notti consecutive; esente <12; dichiarazione mensile. */
export const FIRENZE: ComuneSeedRule = {
  comuneCode: "D612",
  comuneName: "Firenze",
  validFrom: "2025-02-01",
  validTo: null,
  amountsToReconfirm: false,
  rule: {
    currency: "EUR",
    model: "PER_PERSON_PER_NIGHT",
    nightCap: 7,
    nightCapScope: "CONSECUTIVE_SAME_STRUCTURE",
    rates: [{ accommodationCategory: "DEFAULT", zone: "DEFAULT", season: "ALL", amountCents: 600 }],
    surcharges: [],
    ageReductions: [{ maxAge: 12, reductionPct: 100 }],
    ageEvaluatedAt: "STAY_START",
    exemptions: {
      types: [
        "CAREGIVER_MAX_2",
        "DAY_HOSPITAL_PATIENT",
        "STUDENT_LOCAL_UNIV",
        "FORZE_ORDINE",
        "DISABILE_GRAVE_PIU_ACCOMPAGNATORE",
      ],
    },
    declaration: {
      period: "MONTHLY",
      dueDay: 15,
      remittance: {
        channel: "COMUNE_PORTAL",
        url: "https://servizi.comune.fi.it",
        notes: "Dichiarazione mensile entro il 15 del mese successivo.",
      },
    },
  },
};

/** Milano — 6,30 €/notte (2025); tetto 14 notti consecutive; esente <18 (soglia più alta). */
export const MILANO: ComuneSeedRule = {
  comuneCode: "F205",
  comuneName: "Milano",
  validFrom: "2025-01-01",
  validTo: null,
  amountsToReconfirm: false,
  rule: {
    currency: "EUR",
    model: "PER_PERSON_PER_NIGHT",
    nightCap: 14,
    nightCapScope: "CONSECUTIVE_SAME_STRUCTURE",
    rates: [{ accommodationCategory: "DEFAULT", zone: "DEFAULT", season: "ALL", amountCents: 630 }],
    surcharges: [],
    ageReductions: [{ maxAge: 18, reductionPct: 100 }],
    ageEvaluatedAt: "STAY_START",
    exemptions: {
      types: [
        "CAREGIVER_MAX_2",
        "DAY_HOSPITAL_PATIENT",
        "FORZE_ORDINE",
        "DISABILE_GRAVE_PIU_ACCOMPAGNATORE",
      ],
    },
    declaration: {
      period: "QUARTERLY",
      dueDay: 16,
      remittance: {
        channel: "COMUNE_PORTAL",
        url: "https://www.comune.milano.it",
        notes: "[periodo, dueDay e canale DA RICONFERMARE]",
      },
    },
  },
};

/** Venezia — per ZONA e STAGIONE; under 10 esenti + fascia 10–16 al 50%; pagoPA, trimestrale.
 *  ⚠️ IMPORTI SEGNAPOSTO: delibera C.C. 77/2024 (01/04/2025) ha cambiato regime — riverificare. */
export const VENEZIA: ComuneSeedRule = {
  comuneCode: "L736",
  comuneName: "Venezia",
  validFrom: "2025-04-01",
  validTo: null,
  amountsToReconfirm: true,
  rule: {
    currency: "EUR",
    model: "PER_PERSON_PER_NIGHT",
    nightCap: null,
    nightCapScope: "PER_STAY",
    rates: [
      {
        zone: "CENTRO_STORICO",
        season: { ranges: [{ from: "11-01", to: "03-31" }], modifierPct: -30 },
        amountCents: 500,
      },
      {
        zone: "TERRAFERMA",
        season: { ranges: [{ from: "11-01", to: "03-31" }], modifierPct: -30 },
        amountCents: 350,
      },
      { zone: "DEFAULT", season: "ALL", amountCents: 400 },
    ],
    surcharges: [],
    ageReductions: [
      { maxAge: 10, reductionPct: 100 },
      { maxAge: 16, reductionPct: 50 },
    ],
    ageEvaluatedAt: "STAY_START",
    exemptions: {
      types: [
        "CAREGIVER_MAX_2",
        "DAY_HOSPITAL_PATIENT",
        "FORZE_ORDINE",
        "DISABILE_GRAVE_PIU_ACCOMPAGNATORE",
        "RESIDENTE",
      ],
    },
    declaration: {
      period: "QUARTERLY",
      dueDay: 15,
      remittance: {
        channel: "PAGOPA",
        url: "https://www.comune.venezia.it",
        notes: "Comunicazione entro 15 gg dalla chiusura del trimestre; versamento pagoPA.",
      },
    },
  },
};

export const SEED_COMUNI: ComuneSeedRule[] = [ROMA, FIRENZE, MILANO, VENEZIA];
