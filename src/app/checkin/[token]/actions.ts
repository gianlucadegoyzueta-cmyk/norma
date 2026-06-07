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
 * Submit PUBBLICO del check-in ospite. Risolve il token, valida i dati (documento OBBLIGATORIO,
 * ospite singolo), crea l'ospite sul soggiorno e CHIUDE il token. NON genera schedine: restano una
 * scelta dell'host dopo la revisione (un invio sbagliato ad Alloggiati è irreversibile).
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
    // NB: il token NON viene chiuso, così lo stesso link serve per più ospiti dello stesso
    // soggiorno (l'ospite aggiunge sé stesso e i compagni). Scade comunque dopo 30 giorni.
  } catch {
    return { error: "generic" };
  }
  return { ok: true };
}
