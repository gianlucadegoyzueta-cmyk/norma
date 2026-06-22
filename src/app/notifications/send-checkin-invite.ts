"use server";

import { appBaseUrl } from "@/server/auth/email";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { createCheckinToken } from "@/server/modules/checkin/token";
import {
  type CheckinEmailKind,
  CheckinInviteService,
  isValidEmail,
  ResendEmailSender,
} from "@/server/modules/notifications";

/**
 * Server action HOST-INITIATED (manuale, su richiesta): invia all'ospite il link di check-in
 * con l'email on-brand multilingua (invito o promemoria, scelto in base alla vicinanza dell'arrivo).
 *
 * NON è un cron, NON è auto-send: parte solo quando l'host la invoca. Riusa il canale Resend
 * esistente (in dev senza chiave degrada a console → nessun invio reale). Isolamento multi-tenant:
 * il soggiorno deve appartenere all'Organization corrente. Niente PII nei log (mai l'indirizzo).
 *
 * NB: la UI-button di trigger è un follow-up documentato nella PR (le pagine /stays sono contese
 * da altre PR aperte). Questa action è la fetta backend pronta da agganciare.
 */
const service = new CheckinInviteService(new ResendEmailSender());

export type SendCheckinInviteActionResult =
  | { ok: true; kind: CheckinEmailKind }
  | { ok: false; error: string };

export async function sendCheckinInviteAction(
  stayId: string,
  emailRaw: string,
  localeRaw?: string,
): Promise<SendCheckinInviteActionResult> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, error: "Sessione scaduta: rifai il login." };

  const email = emailRaw.trim();
  if (!isValidEmail(email)) return { ok: false, error: "Indirizzo email non valido." };

  // Isolamento: il soggiorno DEVE essere dell'Organization corrente.
  const stay = await prisma.stay.findFirst({
    where: { id: stayId, organizationId: ctx.current.organizationId },
    select: { id: true, arrivalDate: true, property: { select: { name: true } } },
  });
  if (!stay) return { ok: false, error: "Soggiorno non trovato." };

  const token = await createCheckinToken(stayId, ctx.current.organizationId);
  const checkinUrl = `${appBaseUrl()}/checkin/${token}`;

  const result = await service.send({
    to: email,
    propertyName: stay.property.name,
    checkinUrl,
    arrivalDate: stay.arrivalDate,
    locale: localeRaw,
  });

  if (!result.ok) {
    if (result.error === "invalid_email") {
      return { ok: false, error: "Indirizzo email non valido." };
    }
    // Niente PII nel log: nessun indirizzo, nessun contenuto.
    console.error(`[notifications] invio email check-in fallito (stay=${stayId})`);
    return { ok: false, error: "Invio non riuscito. Riprova tra poco." };
  }

  // Tracciamento minimo, email-free (guardrail PII): quando e quale tipo è partito.
  console.info(
    `[notifications] check-in ${result.kind} inviato (stay=${stayId}, locale=${result.locale})`,
  );
  return { ok: true, kind: result.kind };
}
