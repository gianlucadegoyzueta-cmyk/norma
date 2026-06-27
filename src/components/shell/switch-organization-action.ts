"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CURRENT_ORG_COOKIE, getCurrentContext } from "@/server/auth/session";

/**
 * Cambia organizzazione corrente (cookie `current-org`) solo se l'utente è membro dell'org richiesta.
 * Redirect finale sempre verso una path interna sicura (`returnTo`), default dashboard.
 */
export async function switchOrganizationAction(formData: FormData): Promise<void> {
  const ctx = await getCurrentContext();
  if (!ctx) redirect("/login");

  const organizationId = (formData.get("organizationId") ?? "").toString().trim();
  const returnTo = (formData.get("returnTo") ?? "").toString().trim();
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/dashboard";

  const allowed = ctx.organizations.some((o) => o.organizationId === organizationId);
  if (!allowed) redirect(safeReturnTo);

  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
  const secureCookie = process.env.NODE_ENV === "production" && authUrl.startsWith("https://");

  (await cookies()).set(CURRENT_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookie,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  redirect(safeReturnTo);
}
