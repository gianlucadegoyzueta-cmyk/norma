"use server";

import { appBaseUrl } from "@/server/auth/email";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { checkWriteAccess } from "@/server/modules/billing/write-access";
import { createCheckinToken } from "@/server/modules/checkin/token";
import {
  chooseCheckinEmailKind,
  composeCheckinEmail,
  DEFAULT_EMAIL_LOCALE,
  isEmailLocale,
  isValidEmail,
  ResendEmailSender,
} from "@/server/modules/notifications";

const emailSender = new ResendEmailSender();

/**
 * Invia all'ospite, SU RICHIESTA ESPLICITA DELL'HOST (mai automatico), il link di check-in
 * via email. Riusa il canale Resend esistente. Sceglie invito o promemoria in base alla
 * vicinanza dell'arrivo. Non logga MAI l'indirizzo email in chiaro.
 */
export async function sendCheckinLinkEmailAction(
  stayId: string,
  emailRaw: string,
  localeRaw?: string,
): Promise<{ ok: true; kind: "invite" | "reminder" } | { ok: false; error: string }> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, error: "Sessione scaduta: rifai il login." };
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, error: access.message };

  const email = emailRaw.trim();
  if (!isValidEmail(email)) return { ok: false, error: "Indirizzo email non valido." };

  const stay = await prisma.stay.findFirst({
    where: { id: stayId, organizationId: ctx.current.organizationId },
    select: { id: true, arrivalDate: true, property: { select: { name: true } } },
  });
  if (!stay) return { ok: false, error: "Soggiorno non trovato." };

  const locale = isEmailLocale(localeRaw) ? localeRaw : DEFAULT_EMAIL_LOCALE;
  const kind = chooseCheckinEmailKind(stay.arrivalDate);

  const token = await createCheckinToken(stayId, ctx.current.organizationId);
  const checkinUrl = `${appBaseUrl()}/checkin/${token}`;
  const composed = composeCheckinEmail({
    kind,
    locale,
    propertyName: stay.property.name,
    checkinUrl,
  });

  try {
    await emailSender.send({ to: email, subject: composed.subject, text: composed.text });
  } catch {
    // Niente PII nel log: nessun indirizzo, nessun contenuto.
    console.error(`[notifications] invio email check-in fallito (stay=${stayId})`);
    return { ok: false, error: "Invio non riuscito. Riprova tra poco." };
  }

  // Tracciamento minimo, email-free (guardrail PII): quando e quale tipo è partito.
  console.info(`[notifications] check-in ${kind} inviato (stay=${stayId}, locale=${locale})`);
  return { ok: true, kind };
}
