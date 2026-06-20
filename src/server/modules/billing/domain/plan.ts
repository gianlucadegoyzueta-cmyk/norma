// Catalogo commerciale di Norma (dominio puro, niente Stripe qui).
//
// Decisione di prodotto (aggiornata 2026-06-20 — decisione founder):
//  - ANNUALE-FIRST: €90/anno per struttura (≈ €7,50/mese), è il piano consigliato.
//  - MENSILE €9/mese: rampa di fiducia, volutamente meno conveniente per spingere l'annuale.
//  - Agenzie/property manager: €6/mese a struttura (€72/anno) — gestito come listino sul sito marketing.
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

// NB lookup_key bumpati a _v2 col cambio prezzo (2026-06-20): a Stripe-attivo il bootstrap
// "cerca-prima-di-crea" creerà Price NUOVI a €90/€9, senza riusare i vecchi Price a €120/€14.
export const ANNUAL_PLAN: PlanDefinition = {
  plan: "ANNUAL",
  lookupKey: "norma_annual_v2",
  amountCents: 90_00,
  interval: "year",
  label: "Annuale — €90/anno",
  recommended: true,
};

export const MONTHLY_PLAN: PlanDefinition = {
  plan: "MONTHLY",
  lookupKey: "norma_monthly_v2",
  amountCents: 9_00,
  interval: "month",
  label: "Mensile — €9/mese",
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

/** Formatta centesimi EUR in stringa leggibile (es. 9000 → "90,00 €"). */
export function formatEuroCents(cents: number): string {
  const euros = (cents / 100).toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${euros} €`;
}
