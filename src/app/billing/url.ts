import type { BillingPlan } from "@prisma/client";
import { BillingNoCustomerError } from "@/server/modules/billing";
import { appBaseUrl } from "@/server/auth/email";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { checkoutService } from "./_lib/billing";

function parsePlan(value: string | null | undefined): BillingPlan {
  return value === "MONTHLY" ? "MONTHLY" : "ANNUAL";
}

export async function checkoutUrlForCurrentContext(
  rawPlan: string | null | undefined,
): Promise<{ ok: true; url: string } | { ok: false; reason: "UNAUTHORIZED" }> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, reason: "UNAUTHORIZED" };
  const quantity = await prisma.property.count({
    where: { organizationId: ctx.current.organizationId },
  });
  const base = appBaseUrl();
  const { url } = await checkoutService().startCheckout({
    organizationId: ctx.current.organizationId,
    plan: parsePlan(rawPlan),
    quantity,
    customerEmail: ctx.user.email,
    successUrl: `${base}/billing?checkout=success`,
    cancelUrl: `${base}/billing?checkout=cancel`,
  });
  return { ok: true, url };
}

export async function portalUrlForCurrentContext(): Promise<
  { ok: true; url: string } | { ok: false; reason: "UNAUTHORIZED" | "NO_CUSTOMER" }
> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, reason: "UNAUTHORIZED" };
  try {
    const { url } = await checkoutService().startPortal({
      organizationId: ctx.current.organizationId,
      returnUrl: `${appBaseUrl()}/billing`,
    });
    return { ok: true, url };
  } catch (err) {
    if (err instanceof BillingNoCustomerError) return { ok: false, reason: "NO_CUSTOMER" };
    throw err;
  }
}
