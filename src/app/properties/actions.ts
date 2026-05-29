"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import {
  PrismaCredentialLookup,
  PrismaPropertyRepository,
  PropertiesError,
  PropertiesService,
} from "@/server/modules/properties";

// Tipo locale (NON esportato): un file "use server" può esportare solo funzioni async.
type Result = { ok: boolean; message: string };

/**
 * Crea un immobile. L'organizationId NON arriva dal client: lo prendiamo da getCurrentContext
 * (isolamento). Il vincolo di provincia e l'isolamento della credenziale sono nel servizio.
 */
export async function createPropertyAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const proprietario = String(formData.get("proprietario") ?? "").trim();
  const comuneId = String(formData.get("comuneId") ?? "").trim();
  const credentialRaw = String(formData.get("credentialId") ?? "").trim();
  const credentialId = credentialRaw === "" ? null : credentialRaw;

  const service = new PropertiesService(
    new PrismaPropertyRepository(prisma),
    new PrismaCredentialLookup(prisma),
  );

  try {
    await service.createProperty({
      organizationId: ctx.current.organizationId,
      name,
      address,
      proprietario,
      comuneId,
      credentialId,
    });
  } catch (err) {
    // Gli errori di dominio hanno messaggi adatti all'utente; gli altri restano generici.
    if (err instanceof PropertiesError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore nella creazione dell'immobile. Riprova." };
  }

  revalidatePath("/properties");
  return { ok: true, message: `Immobile "${name}" aggiunto ✓` };
}
