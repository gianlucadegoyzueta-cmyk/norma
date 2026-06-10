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
  SoapAlloggiatiSender,
  SoapRicevutaSummaryReader,
  TokenManager,
  VaultCredentialProvider,
} from "@/server/modules/alloggiati";
import { buildSendSummary } from "./send-summary";
import type { OutboxResult, SendResult } from "./types";

// Alias locale per le azioni semplici (verifica). I tipi "ricchi" stanno in ./types perché un
// file "use server" può esportare solo funzioni async.
type Result = OutboxResult;

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
  _prev: SendResult | null,
  formData: FormData,
): Promise<SendResult> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };
  if (formData.get("confirm") !== "yes") {
    return { ok: false, message: "Invio non confermato." };
  }

  const credentialId = String(formData.get("credentialId") ?? "").trim();
  const { client, credRepo, tokens, schedinaRepo, build } = deps();
  const denied = await guardCredential(credRepo, credentialId, ctx.current.organizationId);
  if (denied) return { ok: false, message: denied };

  // Cattura le PENDING PRIMA del batch: sono ESATTAMENTE le righe che verranno processate.
  // Ci servono i loro id per derivare l'esito riga-per-riga dopo, senza toccare l'outbox.
  const pendingBefore = await schedinaRepo.listPendingByCredential(credentialId);
  const sentIds = new Set(pendingBefore.map((r) => r.id));

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

  if (sentIds.size === 0) {
    return { ok: true, message: "Nessuna schedina da inviare per questa credenziale." };
  }

  // Rileggi gli stati AGGIORNATI delle sole righe inviate e derivane il riepilogo. `listForOrganization`
  // è già filtrata per org (isolamento); restringiamo agli id catturati prima del batch.
  const updated = await schedinaRepo.listForOrganization(ctx.current.organizationId);
  const summary = buildSendSummary(updated.filter((r) => sentIds.has(r.id)));

  revalidatePath("/schedine");
  return { ok: true, message: "Invio elaborato.", summary };
}

/**
 * Rimette in coda una schedina REJECTED (transizione REJECTED → PENDING, già prevista dal dominio):
 * dopo aver corretto i dati dell'ospite, l'host può ri-tentare l'invio senza vicoli ciechi.
 * NON è un re-invio: riporta solo lo stato a "da inviare". Isolamento verificato via findById(org).
 */
export async function reopenRejectedAction(
  _prev: OutboxResult | null,
  formData: FormData,
): Promise<OutboxResult> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };

  const schedinaId = String(formData.get("schedinaId") ?? "").trim();
  if (!schedinaId) return { ok: false, message: "Schedina non indicata." };

  const schedinaRepo = new PrismaSchedinaRepository(prisma);
  const found = await schedinaRepo.findById(schedinaId, ctx.current.organizationId);
  if (!found) return { ok: false, message: "Schedina non trovata per questa organizzazione." };
  if (found.status !== "REJECTED") {
    return { ok: false, message: "Solo le schedine respinte si possono rimettere in coda." };
  }

  try {
    // La transizione valida from=REJECTED→to=PENDING e azzera gli errori (logica di dominio esistente).
    await schedinaRepo.applyDecision(schedinaId, {
      status: "PENDING",
      errorCod: null,
      errorDes: null,
    });
  } catch (err) {
    return {
      ok: false,
      message: `Impossibile rimettere in coda: ${err instanceof Error ? err.message : "errore inatteso"}.`,
    };
  }

  revalidatePath("/schedine");
  return { ok: true, message: "Rimessa in coda: ora è di nuovo da inviare." };
}

/**
 * Rimette in coda una schedina NEEDS_REVIEW (esaurita i tentativi automatici): l'host ha risolto il
 * problema → la riga torna PENDING con i tentativi AZZERATI, così riparte pulita.
 */
export async function reopenNeedsReviewAction(
  _prev: OutboxResult | null,
  formData: FormData,
): Promise<OutboxResult> {
  const ctx = await getCurrentContext();
  if (!ctx) return { ok: false, message: "Sessione scaduta: rifai il login." };

  const schedinaId = String(formData.get("schedinaId") ?? "").trim();
  if (!schedinaId) return { ok: false, message: "Schedina non indicata." };

  const schedinaRepo = new PrismaSchedinaRepository(prisma);
  const found = await schedinaRepo.findById(schedinaId, ctx.current.organizationId);
  if (!found) return { ok: false, message: "Schedina non trovata per questa organizzazione." };
  if (found.status !== "NEEDS_REVIEW") {
    return { ok: false, message: "Solo le schedine da rivedere si possono rimettere in coda." };
  }

  try {
    await schedinaRepo.reopenForRetry(schedinaId);
  } catch (err) {
    return {
      ok: false,
      message: `Impossibile rimettere in coda: ${err instanceof Error ? err.message : "errore inatteso"}.`,
    };
  }

  revalidatePath("/schedine");
  return { ok: true, message: "Rimessa in coda: tentativi azzerati, di nuovo da inviare." };
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
 * Riconciliazione T+1 PER CONTEGGIO (vedi DECISIONS D3/D4): confronta il numero di schedine
 * UNVERIFIED del giorno con le "SCHEDINE INVIATE" della Ricevuta aggregata.
 * Conteggi pari → ACQUIRED; ricevuta vuota → PENDING (re-inviabili); mismatch → NEEDS_REVIEW.
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
      new SoapRicevutaSummaryReader(tokens, client),
    );
    const result = await reconcile.reconcileCredential(credentialId, receiptDateIso);

    if (result.total === 0) {
      return { ok: true, message: "Nessuna schedina da verificare per questa credenziale." };
    }

    revalidatePath("/schedine");
    const verdictMsg =
      result.verdict === "MATCH"
        ? `${result.confirmed} confermate (conteggi pari)`
        : result.verdict === "NONE_SENT"
          ? `${result.requeued} ri-accodate (nulla risulta inviato)`
          : `${result.review} in revisione: attese ${result.expected}, ` +
            `ricevuta ${result.reported} — mismatch, batch da verificare a mano`;
    return {
      ok: true,
      message: `Riconciliazione ${receiptDateIso}: ${verdictMsg} su ${result.total} da verificare.`,
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
