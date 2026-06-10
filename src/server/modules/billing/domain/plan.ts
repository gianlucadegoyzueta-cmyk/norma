// Catalogo commerciale di Norma (dominio puro, niente Stripe qui).
//
// Decisione di prodotto (Piano Marketing, maggio 2026 — vedi spec corsia B):
//  - ANNUALE-FIRST: €120/anno per struttura (≈ €10/mese), è il piano consigliato.
//  - MENSILE €14/mese: rampa di fiducia, volutamente meno conveniente per spingere l'annuale.
//  - Il TRIAL ("gratis fino al primo ospite") NON è un piano e NON è un trial Stripe a giorni:
//    è logica applicativa di accesso (vedi ./access.ts).
//
// Il denaro è sempre in centesimi (Int), mai virgola mobile — convenzione del progetto.

import type { BillingPlan } from "@prisma/client";

export const BILLING_CURRENCY = "eur" as const;

/** Nome del Product Stripe (uno solo: il piano "Norma" con due Price). */
export const NORMA_PRODUCT_NAME = "Norma";

export type BillingInterval = "year" | "month";

export interface PlanDefinition {
  plan: BillingPlan;
  /** `lookup_key` del Price su Stripe: stabile, usato per cercare-prima-di-creare (bootstrap idempotente). */
  lookupKey: string;
  amountCents: number;
  interval: BillingInterval;
  /** Etichetta UI (italiano). */
  label: string;
  recommended: boolean;
}

export const ANNUAL_PLAN: PlanDefinition = {
  plan: "ANNUAL",
  lookupKey: "norma_annual_v1",
  amountCents: 120_00,
  interval: "year",
  label: "Annuale — €120/anno",
  recommended: true,
};

export const MONTHLY_PLAN: PlanDefinition = {
  plan: "MONTHLY",
  lookupKey: "norma_monthly_v1",
  amountCents: 14_00,
  interval: "month",
  label: "Mensile — €14/mese",
  recommended: false,
};

/** Tutti i piani, in ordine di presentazione (annuale-first). */
export const PLANS: readonly PlanDefinition[] = [ANNUAL_PLAN, MONTHLY_PLAN];

export function planByLookupKey(lookupKey: string): PlanDefinition | null {
  return PLANS.find((p) => p.lookupKey === lookupKey) ?? null;
}

export function planByKind(plan: BillingPlan): PlanDefinition {
  const def = PLANS.find((p) => p.plan === plan);
  if (!def) throw new Error(`Piano sconosciuto: ${plan}`);
  return def;
}

/** Formatta centesimi EUR in stringa leggibile (es. 12000 → "120,00 €"). */
export function formatEuroCents(cents: number): string {
  const euros = (cents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${euros} €`;
}
