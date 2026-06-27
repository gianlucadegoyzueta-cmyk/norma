"use server";

import type { CredentialCategory, OnboardingUserType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { checkWriteAccess } from "@/server/modules/billing/write-access";
import {
  AlloggiatiSoapClient,
  checkReferenceTablesHealth,
  CredentialService,
  PrismaCredentialRepository,
  PrismaReferenceTableRepository,
  SoapTabellaClient,
  TableSyncService,
  TokenManager,
  VaultCredentialProvider,
} from "@/server/modules/alloggiati";
import { upsertProgress } from "@/server/modules/onboarding/progress";
import { getSecretsVault } from "@/server/secrets";
import { createPropertyAction } from "@/app/properties/actions";
import type { WizardActionState } from "./types";

/** Step 0 → 1: segna che il benvenuto è stato visto (serve alla ripresa refresh-safe). */
export async function advanceFromWelcomeAction(
  _prev: WizardActionState | null,
  _formData: FormData,
): Promise<WizardActionState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };
  await upsertProgress(prisma, ctx.current.organizationId, {
    welcomedAt: new Date(),
    currentStep: 1,
  });
  return { ok: true };
}

/**
 * Step 1 (La tua attività): aggiorna nome utente + nome organizzazione e salva tipo/numero strutture
 * sul progress. Isolamento: l'org è quella corrente (ctx), mai dal client.
 */
export async function saveIdentityAction(
  _prev: WizardActionState | null,
  formData: FormData,
): Promise<WizardActionState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };

  const name = String(formData.get("name") ?? "").trim();
  const organizationName = String(formData.get("organizationName") ?? "").trim();
  const userTypeRaw = String(formData.get("userType") ?? "").trim();
  const structuresRaw = String(formData.get("structuresCount") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Inserisci il tuo nome.";
  if (!organizationName) fieldErrors.organizationName = "Inserisci il nome dell'organizzazione.";
  if (userTypeRaw !== "HOST_SINGOLO" && userTypeRaw !== "PROPERTY_MANAGER") {
    fieldErrors.userType = "Scegli il tipo di attività.";
  }
  const structuresCount = structuresRaw ? Number.parseInt(structuresRaw, 10) : null;
  if (structuresRaw && (!Number.isFinite(structuresCount) || (structuresCount ?? 0) < 1)) {
    fieldErrors.structuresCount = "Indica un numero di strutture valido.";
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Controlla i campi evidenziati.", fieldErrors };
  }

  await prisma.user.update({ where: { id: ctx.user.id }, data: { name } });
  await prisma.organization.update({
    where: { id: ctx.current.organizationId },
    data: { name: organizationName },
  });
  await upsertProgress(prisma, ctx.current.organizationId, {
    userType: userTypeRaw as OnboardingUserType,
    structuresCount,
    identityDoneAt: new Date(),
    currentStep: 2,
  });
  revalidatePath("/onboarding");
  return { ok: true };
}

/**
 * Step 2a — collega la credenziale Alloggiati: salva i segreti nel vault (cifrati) e VERIFICA subito
 * con Authentication_Test (nessun Send). Riusa CredentialService (logica di dominio invariata).
 * Restituisce il credentialId per la sync automatica successiva.
 */
export async function connectCredentialAction(
  _prev: WizardActionState | null,
  formData: FormData,
): Promise<WizardActionState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };

  const label = String(formData.get("label") ?? "").trim();
  const category = String(formData.get("category") ?? "SINGOLA");
  const provincia = String(formData.get("provincia") ?? "")
    .trim()
    .toUpperCase();
  const utente = String(formData.get("utente") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const wskey = String(formData.get("wskey") ?? "").trim();

  const fieldErrors: Record<string, string> = {};
  if (!label) fieldErrors.label = "Dai un'etichetta alla credenziale.";
  if (category !== "SINGOLA" && category !== "GESTIONE_APPARTAMENTI") {
    fieldErrors.category = "Tipo credenziale non valido.";
  }
  if (provincia.length !== 2) fieldErrors.provincia = "Provincia: sigla di 2 lettere (es. RM).";
  if (!utente) fieldErrors.utente = "Inserisci l'utente.";
  if (!password) fieldErrors.password = "Inserisci la password.";
  if (!wskey) fieldErrors.wskey = "Inserisci la WSKey.";
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, message: "Controlla i campi evidenziati.", fieldErrors };
  }

  const repo = new PrismaCredentialRepository(prisma);
  const service = new CredentialService(repo, getSecretsVault(), new AlloggiatiSoapClient());

  let credentialId: string;
  try {
    const cred = await service.onboard({
      organizationId: ctx.current.organizationId,
      label,
      category: category as CredentialCategory,
      provincia,
      secret: { utente, password, wskey },
    });
    credentialId = cred.id;
  } catch {
    return { ok: false, message: "Errore nel salvataggio della credenziale. Riprova." };
  }

  let status = "PENDING_REONBOARDING";
  try {
    status = await service.verify(credentialId, ctx.current.organizationId);
  } catch {
    return {
      ok: false,
      message: "Verifica non riuscita (rete o protocollo). Riprova tra poco.",
    };
  }

  if (status !== "ACTIVE") {
    return {
      ok: false,
      message: "Credenziali non valide: controlla utente, password e WSKey, poi riprova.",
    };
  }

  await upsertProgress(prisma, ctx.current.organizationId, { currentStep: 2 });
  revalidatePath("/onboarding");
  return { ok: true, message: "Credenziale verificata ✓", credentialId };
}

/**
 * Step 2b — sincronizza le tabelle di riferimento (Comuni/Stati/Documenti) in modo AUTOMATICO e
 * invisibile DOPO la verifica. Saltata se le tabelle sono già pronte (caso comune: tabelle globali
 * già popolate da un'altra org). Solo wiring di classi esistenti: nessuna modifica al dominio.
 */
export async function syncReferenceTablesAction(
  _prev: WizardActionState | null,
  formData: FormData,
): Promise<WizardActionState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };

  const credentialId = String(formData.get("credentialId") ?? "").trim();
  if (!credentialId) return { ok: false, message: "Credenziale non indicata." };

  const refRepo = new PrismaReferenceTableRepository(prisma);
  const health = await checkReferenceTablesHealth(refRepo);
  if (health.ready) {
    await upsertProgress(prisma, ctx.current.organizationId, { currentStep: 3 });
    return { ok: true, message: "Tabelle già pronte." };
  }

  try {
    const credRepo = new PrismaCredentialRepository(prisma);
    const client = new AlloggiatiSoapClient({ timeoutMs: 120_000 }); // Luoghi è grande (~11k righe)
    const tokens = new TokenManager(
      client,
      new VaultCredentialProvider(
        { getById: (id) => credRepo.findSecretRef(id) },
        getSecretsVault(),
      ),
    );
    const tabella = new SoapTabellaClient(tokens, client, credentialId);
    await new TableSyncService(tabella, refRepo).syncAll();
  } catch {
    return {
      ok: false,
      message:
        "Non sono riuscito a preparare le tabelle. Puoi riprovare o proseguire e completarle dopo.",
    };
  }

  await upsertProgress(prisma, ctx.current.organizationId, { currentStep: 3 });
  revalidatePath("/onboarding");
  return { ok: true, message: "Tabelle pronte ✓" };
}

/**
 * Step 3 — primo immobile: delega alla server action esistente (isolamento + vincolo provincia già
 * applicati lì) e, in caso di successo, fa avanzare il wizard.
 */
export async function createWizardPropertyAction(
  _prev: WizardActionState | null,
  formData: FormData,
): Promise<WizardActionState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };

  const res = await createPropertyAction(null, formData);
  if (!res.ok) return { ok: false, message: res.message };

  await upsertProgress(prisma, ctx.current.organizationId, { currentStep: 4 });
  revalidatePath("/onboarding");
  return { ok: true, message: res.message };
}

/** Autosave della navigazione (avanti/indietro/salta): persiste l'ultimo step visitato. */
export async function setStepAction(step: number): Promise<void> {
  const ctx = await getCurrentContext();
  if (!ctx) return;
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return;
  const clamped = Math.max(0, Math.min(4, Math.trunc(step)));
  await upsertProgress(prisma, ctx.current.organizationId, { currentStep: clamped });
}

/**
 * Step finale: marca l'onboarding concluso e porta alla destinazione scelta. Le destinazioni
 * riflettono il funnel dati-in (il primo immobile esiste già): collegare il calendario iCal,
 * creare un soggiorno a mano, o entrare in dashboard. Lista bianca di target → niente open-redirect.
 */
const FINISH_TARGETS: Record<string, string> = {
  stays: "/stays",
  properties: "/properties",
  dashboard: "/dashboard",
};

export async function finishOnboardingAction(
  _prev: WizardActionState | null,
  formData: FormData,
): Promise<WizardActionState> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  const access = await checkWriteAccess(ctx.current.organizationId);
  if (!access.ok) return { ok: false, message: access.message };

  const targetKey = String(formData.get("target") ?? "dashboard");
  await upsertProgress(prisma, ctx.current.organizationId, {
    completedAt: new Date(),
    currentStep: 4,
  });
  redirect(FINISH_TARGETS[targetKey] ?? "/dashboard");
}
