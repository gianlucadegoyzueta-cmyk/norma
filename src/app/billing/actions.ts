"use server";

import { redirect } from "next/navigation";
import type { BillingPlan } from "@prisma/client";
import { appBaseUrl } from "@/server/auth/email";
import { getCurrentContext } from "@/server/auth/session";
import { checkoutService } from "./_lib/billing";

function parsePlan(value: FormDataEntryValue | null): BillingPlan {
  return value === "MONTHLY" ? "MONTHLY" : "ANNUAL";
}

/**
 * Avvia Stripe Checkout per il piano scelto e reindirizza alla pagina hosted di Stripe.
 * (Nessun form carte custom: PCI a carico di Stripe.)
 */
export async function startCheckoutAction(formData: FormData): Promise<void> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const base = appBaseUrl();
  const { url } = await checkoutService().startCheckout({
    organizationId: ctx.current.organizationId,
    plan: parsePlan(formData.get("plan")),
    customerEmail: ctx.user.email,
    successUrl: `${base}/billing?checkout=success`,
    cancelUrl: `${base}/billing?checkout=cancel`,
  });
  redirect(url);
}

/** Apre il Customer Portal di Stripe (gestione metodo di pagamento / disdetta). */
export async function openPortalAction(): Promise<void> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const { url } = await checkoutService().startPortal({
    organizationId: ctx.current.organizationId,
    returnUrl: `${appBaseUrl()}/billing`,
  });
  redirect(url);
}
