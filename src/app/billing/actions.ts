"use server";

import { redirect } from "next/navigation";
import { checkoutUrlForCurrentContext, portalUrlForCurrentContext } from "./url";

/**
 * Avvia Stripe Checkout per il piano scelto e reindirizza alla pagina hosted di Stripe.
 * (Nessun form carte custom: PCI a carico di Stripe.)
 */
export async function startCheckoutAction(formData: FormData): Promise<void> {
  const result = await checkoutUrlForCurrentContext(
    typeof formData.get("plan") === "string" ? String(formData.get("plan")) : null,
  );
  if (!result.ok) redirect("/login");
  redirect(result.url);
}

/** Apre il Customer Portal di Stripe (gestione metodo di pagamento / disdetta). */
export async function openPortalAction(): Promise<void> {
  const result = await portalUrlForCurrentContext();
  if (!result.ok) redirect("/billing");
  redirect(result.url);
}
