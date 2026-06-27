"use server";

import { revalidatePath } from "next/cache";
import { syncBillingQuantityForOrganization } from "@/app/billing/_lib/billing";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { checkWriteAccess } from "@/server/modules/billing/write-access";
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
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };

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

  // Non blocca la creazione: se Stripe e` temporaneamente indisponibile, riallineiamo al prossimo update.
  try {
    await syncBillingQuantityForOrganization(ctx.current.organizationId);
  } catch {
    // noop intentional
  }

  revalidatePath("/properties");
  return { ok: true, message: `Immobile "${name}" aggiunto ✓` };
}

/** Parsa una capacità ricettiva dal form: vuoto → null; altrimenti intero ≥ 0 (NaN/negativi → errore). */
function parseCapacity(raw: string, label: string): { value: number | null } | { error: string } {
  const t = raw.trim();
  if (t === "") return { value: null };
  const n = Number(t);
  if (!Number.isInteger(n) || n < 0) {
    return { error: `${label}: inserisci un numero intero pari o superiore a 0.` };
  }
  return { value: n };
}

/**
 * Aggiorna la configurazione ricettiva Ross1000 di un immobile (codice struttura + camere/letti).
 * Sono i dati struttura richiesti dal movimento turistico ISTAT: senza, la struttura resta
 * INCOMPLETE su `/istat`. L'organizationId arriva da getCurrentContext (isolamento), MAI dal client.
 */
export async function updatePropertyRoss1000Action(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };

  const propertyId = String(formData.get("propertyId") ?? "").trim();
  if (!propertyId) return { ok: false, message: "Immobile non specificato." };

  const ross1000Code = String(formData.get("ross1000Code") ?? "");
  const camere = parseCapacity(
    String(formData.get("camereDisponibili") ?? ""),
    "Camere disponibili",
  );
  if ("error" in camere) return { ok: false, message: camere.error };
  const letti = parseCapacity(String(formData.get("lettiDisponibili") ?? ""), "Letti disponibili");
  if ("error" in letti) return { ok: false, message: letti.error };

  const service = new PropertiesService(
    new PrismaPropertyRepository(prisma),
    new PrismaCredentialLookup(prisma),
  );

  try {
    await service.updateRoss1000Config({
      organizationId: ctx.current.organizationId,
      propertyId,
      ross1000Code,
      camereDisponibili: camere.value,
      lettiDisponibili: letti.value,
    });
  } catch (err) {
    if (err instanceof PropertiesError) return { ok: false, message: err.message };
    return { ok: false, message: "Errore nel salvataggio della configurazione. Riprova." };
  }

  // La readiness ISTAT dipende da questi campi: rivalida anche /istat e la pagina immobile.
  revalidatePath("/properties");
  revalidatePath(`/properties/${propertyId}`);
  revalidatePath("/istat");
  return { ok: true, message: "Configurazione ricettiva salvata ✓" };
}
