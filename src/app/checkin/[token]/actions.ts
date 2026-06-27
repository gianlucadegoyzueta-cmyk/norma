"use server";

import { type PersonInput, validatePerson } from "@/app/stays/guest-validation";
import { prisma } from "@/server/db";
import { PrismaReferenceTablesLoader, PrismaSchedinaRepository } from "@/server/modules/alloggiati";
import { checkWriteAccess } from "@/server/modules/billing/write-access";
import { DEFAULT_LOCALE, isLocale, MESSAGES } from "@/server/modules/checkin/messages";
import { validateReferenceIds } from "@/server/modules/checkin/reference-validation";
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
  // Lingua scelta dall'ospite: serve a localizzare gli errori per-campo nelle 5 lingue.
  const langRaw = String(formData.get("lang") ?? "");
  const locale = isLocale(langRaw) ? langRaw : DEFAULT_LOCALE;
  const ctx = await resolveCheckinToken(token);
  if (!ctx) return { error: "invalid" };
  const access = await checkWriteAccess(ctx.organizationId);
  if (!access.ok) return { error: "generic" };

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

  const { data, errorCodes } = validatePerson(input, true);
  if (!data) {
    // Traduce i codici di errore neutri nelle stringhe della lingua dell'ospite.
    const labels = MESSAGES[locale].fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [field, code] of Object.entries(errorCodes)) fieldErrors[field] = labels[code];
    return { fieldErrors };
  }

  try {
    // Difesa in profondità (pagina PUBBLICA: gli ID di select/combobox sono manipolabili): verifica
    // che gli ID di riferimento ESISTANO a DB e, in caso contrario, torna un errore PER-CAMPO
    // localizzato invece di un errore FK generico a valle. `documentPlaceId` può essere un Comune O
    // un Country (luogo di rilascio): lo cerchiamo in entrambe le tabelle.
    const idsIn = (xs: (string | null | undefined)[]) => ({
      id: { in: xs.filter((x): x is string => !!x) },
    });
    const [countries, comuni, documentTypes] = await Promise.all([
      prisma.country.findMany({
        where: idsIn([
          data.birthCountryId,
          data.citizenshipId,
          data.residenceCountryId,
          data.documentPlaceId,
        ]),
        select: { id: true },
      }),
      prisma.comune.findMany({
        where: idsIn([data.birthComuneId, data.residenceComuneId, data.documentPlaceId]),
        select: { id: true },
      }),
      prisma.documentType.findMany({ where: idsIn([data.documentTypeId]), select: { id: true } }),
    ]);
    const refErrors = validateReferenceIds(data, {
      countries: new Set(countries.map((r) => r.id)),
      comuni: new Set(comuni.map((r) => r.id)),
      documentTypes: new Set(documentTypes.map((r) => r.id)),
    });
    if (Object.keys(refErrors).length > 0) {
      const labels = MESSAGES[locale].fieldErrors;
      const fieldErrors: Record<string, string> = {};
      for (const [field, code] of Object.entries(refErrors)) fieldErrors[field] = labels[code];
      return { fieldErrors };
    }

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
