"use server";

import { revalidatePath } from "next/cache";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { getSecretsVault } from "@/server/secrets";
import {
  AlloggiatiSoapClient,
  PrismaCredentialRepository,
  PrismaReferenceTablesLoader,
  PrismaSchedinaRepository,
  SchedinaOutboxService,
  SchedinaRecordBuilder,
  SchedinaReconcileService,
  SchedinaVerifyService,
  SoapAcquisitionReceiptReader,
  SoapAlloggiatiSender,
  TokenManager,
  VaultCredentialProvider,
} from "@/server/modules/alloggiati";

// Tipo locale (NON esportato): un file "use server" può esportare solo funzioni async.
type Result = { ok: boolean; message: string };

/** Dipendenze condivise per verifica/invio di una credenziale. */
function deps() {
  const client = new AlloggiatiSoapClient();
  const credRepo = new PrismaCredentialRepository(prisma);
  // Il provider del vault risolve credentialId → secretRef (lettura interna post-autorizzazione:
  // il batch parte solo dopo guardCredential, che ha già verificato l'appartenenza all'org).
  const tokens = new TokenManager(
    client,
    new VaultCredentialProvider({ getById: (id) => credRepo.findSecretRef(id) }, getSecretsVault()),
  );
  const schedinaRepo = new PrismaSchedinaRepository(prisma);
  const recordBuilder = new SchedinaRecordBuilder(prisma, new PrismaReferenceTablesLoader(prisma));
  const build = (id: string) => recordBuilder.build(id);
  return { client, credRepo, tokens, schedinaRepo, build };
}

/**
 * Carica una credenziale verificando ISOLAMENTO (è dell'org) e che sia ATTIVA.
 * Restituisce un messaggio d'errore (string) se non utilizzabile, altrimenti null.
 */
async function guardCredential(
  credRepo: PrismaCredentialRepository,
  credentialId: string,
  organizationId: string,
): Promise<string | null> {
  // getById ora filtra per organizationId: se la credenziale è di un'altra org → null (il
  // controllo manuale "cred.organizationId !== organizationId" è ridondante e rimosso).
  const cred = await credRepo.getById(credentialId, organizationId);
  if (!cred) {
    return "Credenziale non trovata per questa organizzazione.";
  }
  if (cred.status !== "ACTIVE") {
    return 'Credenziale non ATTIVA: verificala in "Credenziali" prima di procedere.';
  }
  return null;
}

/**
 * VERIFICA (Test) le schedine PENDING di una credenziale: validazione lato Alloggiati, SENZA
 * inviare nulla e senza cambiare stato. Sicuro e ripetibile: è il passo da fare prima dell'invio.
 */
export async function verifyCredentialAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };

  const credentialId = String(formData.get("credentialId") ?? "").trim();
  const { client, credRepo, tokens, schedinaRepo, build } = deps();
  const denied = await guardCredential(credRepo, credentialId, ctx.current.organizationId);
  if (denied) return { ok: false, message: denied };

  try {
    const res = await new SchedinaVerifyService(
      schedinaRepo,
      tokens,
      client,
      build,
    ).verifyCredentialBatch(credentialId);

    if (res.total === 0) {
      return { ok: true, message: "Nessuna schedina da inviare per questa credenziale." };
    }
    if (res.valid === res.total) {
      return {
        ok: true,
        message: `✓ Tutte valide (${res.total}/${res.total}). Pronte per l'invio.`,
      };
    }
    const problems = res.rows
      .filter((r) => !r.valid)
      .slice(0, 3)
      .map((r) => r.errorDes ?? r.errorCod ?? "errore")
      .join("; ");
    const more = res.total - res.valid > 3 ? "…" : "";
    return {
      ok: false,
      message: `${res.valid}/${res.total} valide. Da correggere prima dell'invio: ${problems}${more}`,
    };
  } catch {
    return { ok: false, message: "Verifica non riuscita (rete o credenziali). Riprova più tardi." };
  }
}

/**
 * INVIA (Send) le schedine PENDING di una credenziale ad Alloggiati. ⚠️ IRREVERSIBILE: una
 * schedina acquisita non si può cancellare. Richiede conferma esplicita (campo `confirm=yes`).
 * In caso di esito ignoto (timeout) l'outbox porta le schedine in UNVERIFIED, MAI ritenta alla
 * cieca: l'esito reale si riconcilia con la Ricevuta a T+1.
 */
export async function sendCredentialAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  if (formData.get("confirm") !== "yes") {
    return { ok: false, message: "Invio non confermato." };
  }

  const credentialId = String(formData.get("credentialId") ?? "").trim();
  const { client, credRepo, tokens, schedinaRepo, build } = deps();
  const denied = await guardCredential(credRepo, credentialId, ctx.current.organizationId);
  if (denied) return { ok: false, message: denied };

  try {
    const sender = new SoapAlloggiatiSender(tokens, client);
    await new SchedinaOutboxService(schedinaRepo, sender, build).processCredentialBatch(
      credentialId,
    );
  } catch (err) {
    // L'outbox gestisce internamente rete/timeout (→ UNVERIFIED). Un'eccezione qui è anomala
    // (es. record non costruibile): nessuna schedina è passata a SENDING in quel caso.
    return {
      ok: false,
      message: `Invio non riuscito: ${err instanceof Error ? err.message : "errore inatteso"}.`,
    };
  }

  revalidatePath("/schedine");
  return { ok: true, message: "Invio elaborato. Controlla gli stati aggiornati qui sotto." };
}

/** Data in fuso Europe/Rome come "YYYY-MM-DD". */
function romeDateIso(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function romeYesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return romeDateIso(d);
}

/**
 * Riconciliazione T+1: confronta le schedine UNVERIFIED con la Ricevuta di un giorno passato.
 * Confermate → ACQUIRED; assenti → PENDING (re-inviabili in sicurezza).
 */
export async function reconcileCredentialAction(
  _prev: Result | null,
  formData: FormData,
): Promise<Result> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };

  const credentialId = String(formData.get("credentialId") ?? "").trim();
  const receiptDateRaw = String(formData.get("receiptDate") ?? "").trim();
  const receiptDateIso = receiptDateRaw || romeYesterdayIso();

  const { client, credRepo, tokens, schedinaRepo } = deps();
  const denied = await guardCredential(credRepo, credentialId, ctx.current.organizationId);
  if (denied) return { ok: false, message: denied };

  try {
    const reconcile = new SchedinaReconcileService(
      schedinaRepo,
      new SoapAcquisitionReceiptReader(tokens, client),
    );
    const result = await reconcile.reconcileCredential(credentialId, receiptDateIso);

    if (result.total === 0) {
      return { ok: true, message: "Nessuna schedina da verificare per questa credenziale." };
    }

    revalidatePath("/schedine");
    return {
      ok: true,
      message:
        `Riconciliazione ${receiptDateIso}: ${result.confirmed} confermate, ` +
        `${result.requeued} ri-accodate su ${result.total} da verificare.`,
    };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Riconciliazione non riuscita (rete, Ricevuta o credenziali).",
    };
  }
}
