// Servizio di STIMA della tassa di soggiorno per un soggiorno.
// Ponte tra la persistenza (regola valida per data) e il calcolatore PURO.
// Nessuna logica di calcolo qui: quella è in domain/calculator (testata a parte).

import { computeTouristTax, type TouristTaxResult } from "../domain/calculator";
import type { TouristTaxConfigRepository } from "../ports/TouristTaxConfigRepository";

export interface EstimateStayInput {
  comuneId: string;
  arrivalDate: Date;
  departureDate: Date | null;
  accommodationCategory?: string | null;
  touristTaxZone?: string | null;
  guests: Array<{ id: string; birthDate: Date; taxExemptionType?: string | null }>;
}

export type EstimateOutcome =
  | { kind: "OK"; result: TouristTaxResult }
  /** Nessuna regola per il comune alla data: NON stimiamo (niente numeri silenziosamente errati). */
  | { kind: "NO_RULE"; comuneId: string };

export class TouristTaxEstimateService {
  constructor(private readonly configRepo: TouristTaxConfigRepository) {}

  async estimateForStay(stay: EstimateStayInput): Promise<EstimateOutcome> {
    const rule = await this.configRepo.findRuleForDate(stay.comuneId, stay.arrivalDate);
    if (!rule) return { kind: "NO_RULE", comuneId: stay.comuneId };

    const result = computeTouristTax(
      {
        arrivalDate: stay.arrivalDate,
        departureDate: stay.departureDate,
        accommodationCategory: stay.accommodationCategory ?? undefined,
        zone: stay.touristTaxZone ?? undefined,
      },
      stay.guests.map((g) => ({
        id: g.id,
        birthDate: g.birthDate,
        exemptionType: g.taxExemptionType ?? null,
      })),
      rule,
    );
    return { kind: "OK", result };
  }
}

/** Formatta centesimi in euro italiani (es. 1260 → "12,60 €"). PURA. */
export function formatEuroCents(cents: number): string {
  return `${(cents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}
