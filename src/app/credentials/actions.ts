"use server";

import type { CredentialCategory } from "@prisma/client";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import {
  AlloggiatiSoapClient,
  CredentialService,
  PrismaCredentialRepository,
} from "@/server/modules/alloggiati";
import { getSecretsVault } from "@/server/secrets";
import { buildDataExport } from "@/server/modules/export/load";
import { revalidatePath } from "next/cache";

// Tipo locale (NON esportato): un file "use server" può esportare solo funzioni async.
type Result = { ok: boolean; message: string };

/**
 * Onboarding di una credenziale Alloggiati: salva i segreti nel vault (cifrati) + crea la riga,
 * poi VERIFICA subito con Authentication_Test (nessun Send). Restituisce un esito per la UI.
 * L'organizationId NON arriva dal client: lo prendiamo da getCurrentContext (isolamento).
 */
export async function onboardCredentialAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };

  const label = String(formData.get("label") ?? "").trim();
  const category = String(formData.get("category") ?? "SINGOLA") as CredentialCategory;
  const provincia = String(formData.get("provincia") ?? "")
    .trim()
    .toUpperCase();
  const utente = String(formData.get("utente") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const wskey = String(formData.get("wskey") ?? "").trim();

  if (!label || !provincia || !utente || !password || !wskey) {
    return { ok: false, message: "Compila tutti i campi." };
  }
  if (provincia.length !== 2) {
    return { ok: false, message: "Provincia: usa la sigla di 2 lettere (es. RM)." };
  }

  const repo = new PrismaCredentialRepository(prisma);
  const service = new CredentialService(repo, getSecretsVault(), new AlloggiatiSoapClient());

  let credId: string;
  try {
    const cred = await service.onboard({
      organizationId: ctx.current.organizationId,
      label,
      category,
      provincia,
      secret: { utente, password, wskey },
    });
    credId = cred.id;
  } catch {
    return { ok: false, message: "Errore nel salvataggio della credenziale. Riprova." };
  }

  // Verifica live. Best-effort: un errore transitorio lascia lo stato PENDING.
  let status = "PENDING_REONBOARDING";
  try {
    status = await service.verify(credId, ctx.current.organizationId);
  } catch {
    // errore transitorio di rete/protocollo
  }
  revalidatePath("/credentials");

  if (status === "ACTIVE") {
    return { ok: true, message: `Credenziale "${label}" aggiunta e VERIFICATA ✓` };
  }
  if (status === "INVALID") {
    return {
      ok: false,
      message: `"${label}" salvata, ma Authentication_Test è fallito: utente/password/wskey non validi. Correggi e ricrea.`,
    };
  }
  return {
    ok: true,
    message: `"${label}" salvata. Verifica non riuscita per un errore temporaneo: riprova più tardi.`,
  };
}

/**
 * Export "I tuoi dati": zip di CSV (soggiorni, ospiti, tasse, ISTAT) della propria organizzazione.
 * Solo dati dell'org dal contesto (isolamento) — niente segreti/credenziali. Ritorna il file in
 * base64 perché un Server Action serializza JSON (i byte grezzi non attraversano il confine RSC).
 */
export async function exportDataAction(): Promise<
  { ok: true; filename: string; base64: string } | { ok: false; message: string }
> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };

  try {
    const { filename, bytes } = await buildDataExport(prisma, ctx.current.organizationId);
    return { ok: true, filename, base64: Buffer.from(bytes).toString("base64") };
  } catch {
    return { ok: false, message: "Errore nella preparazione dell'export. Riprova." };
  }
}
