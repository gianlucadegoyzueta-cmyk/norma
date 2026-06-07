"use server";

import { appBaseUrl } from "@/server/auth/email";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { createCheckinToken } from "@/server/modules/checkin/token";

/**
 * Genera un link PUBBLICO di check-in per un soggiorno dell'organizzazione corrente.
 * Verifica la proprietà del soggiorno (isolamento multi-tenant), crea il token e ritorna l'URL
 * completo da condividere con l'ospite.
 */
export async function generateCheckinLinkAction(
  stayId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, error: "Sessione scaduta: rifai il login." };

  const stay = await prisma.stay.findFirst({
    where: { id: stayId, organizationId: ctx.current.organizationId },
    select: { id: true },
  });
  if (!stay) return { ok: false, error: "Soggiorno non trovato." };

  const token = await createCheckinToken(stayId, ctx.current.organizationId);
  return { ok: true, url: `${appBaseUrl()}/checkin/${token}` };
}
