"use server";

import { type PersonInput, validatePerson } from "@/app/stays/guest-validation";
import { prisma } from "@/server/db";
import { PrismaReferenceTablesLoader, PrismaSchedinaRepository } from "@/server/modules/alloggiati";
import { resolveCheckinToken } from "@/server/modules/checkin/token";
import { PrismaStaysRepository, StaysService } from "@/server/modules/stays";

export type CheckinSubmitState = {
  ok?: boolean;
  /** "invalid" = token scaduto/usato; "generic" = errore inatteso. */
  error?: "invalid" | "generic";
  fieldErrors?: Record<string, string>;
};

/**
 * Submit PUBBLICO del check-in ospite. Risolve il token, valida i dati (documento OBBLIGATORIO),
 * aggiunge l'ospite al soggiorno. Il token resta valido (più ospiti per lo stesso soggiorno), scade a 30gg.
 *
 * AUTOMAZIONE: appena i dati del soggiorno sono completi, genera le schedine PENDING (best-effort).
 * Generare ≠ inviare: gli intenti restano in outbox e sono REVERSIBILI; l'invio reale alla Questura
 * resta gated (ALLOGGIATI_CRON_ENABLED + autoSend per-credenziale, guardrail #1). Dati incompleti o
 * arrivo fuori finestra → tryGenerateSchedine non lancia, il check-in va comunque a buon fine.
 */
export async function submitCheckinAction(
  _prev: CheckinSubmitState,
  formData: FormData,
): Promise<CheckinSubmitState> {
  const token = String(formData.get("token") ?? "");
  const ctx = await resolveCheckinToken(token);
  if (!ctx) return { error: "invalid" };

  const v = (k: string) => {
    const s = String(formData.get(k) ?? "").trim();
    return s ? s : undefined;
  };
  const input: PersonInput = {
    firstName: v("firstName"),
    lastName: v("lastName"),
    sex: v("sex"),
    birthDate: v("birthDate"),
    birthCountryId: v("birthCountryId"),
    citizenshipId: v("citizenshipId"),
    birthComuneId: v("birthComuneId"),
    residenceCountryId: v("residenceCountryId"),
    residenceComuneId: v("residenceComuneId"),
    residenceForeignLocality: v("residenceForeignLocality"),
    tourismType: v("tourismType"),
    transportMeans: v("transportMeans"),
    documentTypeId: v("documentTypeId"),
    documentNumber: v("documentNumber"),
    documentPlaceId: v("documentPlaceId"),
  };

  const { data, errors } = validatePerson(input, true);
  if (!data) return { fieldErrors: errors };

  try {
    const service = new StaysService(
      new PrismaStaysRepository(prisma),
      new PrismaSchedinaRepository(prisma),
      new PrismaReferenceTablesLoader(prisma),
    );
    await service.addGuests(ctx.stayId, ctx.organizationId, [{ tipo: "SINGOLO", ospite: data }]);
    // Il token NON viene chiuso: lo stesso link serve per più ospiti dello stesso soggiorno
    // (l'ospite aggiunge sé stesso e i compagni). Scade comunque dopo 30 giorni.
    //
    // Chiude il loop dati→schedina: genera gli intenti PENDING appena il soggiorno è completo.
    // best-effort (non lancia) e PRE-INVIO (l'invio reale resta gated): non altera l'esito del check-in.
    await service.tryGenerateSchedine(ctx.stayId);
  } catch {
    return { error: "generic" };
  }
  return { ok: true };
}
