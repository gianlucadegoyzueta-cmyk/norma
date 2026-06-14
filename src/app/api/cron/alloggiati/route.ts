import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getSecretsVault } from "@/server/secrets";
import {
  AlloggiatiSoapClient,
  evaluateCronGate,
  PrismaCredentialRepository,
  PrismaReferenceTablesLoader,
  PrismaSchedinaRepository,
  runSendAndReconcile,
  SchedinaOutboxService,
  SchedinaRecordBuilder,
  SchedinaReconcileService,
  SchedinaVerifyService,
  SoapAlloggiatiSender,
  SoapRicevutaSummaryReader,
  TokenManager,
  VaultCredentialProvider,
  verifyParkAndSend,
} from "@/server/modules/alloggiati";

// ⚠️ SCHEDULER INVIO + RICONCILIAZIONE — DISATTIVATO DI DEFAULT.
//
// Gira SOLO se `ALLOGGIATI_CRON_ENABLED === "true"` (env Vercel) E con l'auth del cron Vercel
// (`Authorization: Bearer $CRON_SECRET`). Vedi domain/cron-gate.ts per le due barriere e il perché
// (guardrail CLAUDE.md: l'invio reale verso la Questura non si accende in autonomia).
//
// Per attivarlo (decisione umana, consapevole):
//   1. aggiungere la voce in vercel.json (crons) — vedi vercel.cron.example.json in repo;
//   2. settare su Vercel `CRON_SECRET` e `ALLOGGIATI_CRON_ENABLED=true`.
// Finché il flag è assente/≠"true", questa route è un no-op che risponde 200 {disabled:true}.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** "Ieri" in fuso Europe/Rome come "YYYY-MM-DD" (la Ricevuta è interrogabile solo a giorno passato). */
function romeYesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export async function GET(req: Request) {
  const gate = evaluateCronGate({
    enabledFlag: process.env.ALLOGGIATI_CRON_ENABLED,
    cronSecret: process.env.CRON_SECRET,
    authHeader: req.headers.get("authorization"),
  });

  if (gate.kind === "disabled") {
    return NextResponse.json({ ok: true, disabled: true });
  }
  if (gate.kind === "unauthorized") {
    return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });
  }

  // --- gate.kind === "run": cabla lo stack reale (stesso wiring delle server action) ---
  const client = new AlloggiatiSoapClient();
  const credRepo = new PrismaCredentialRepository(prisma);
  const tokens = new TokenManager(
    client,
    new VaultCredentialProvider({ getById: (id) => credRepo.findSecretRef(id) }, getSecretsVault()),
  );
  const schedinaRepo = new PrismaSchedinaRepository(prisma);
  const recordBuilder = new SchedinaRecordBuilder(prisma, new PrismaReferenceTablesLoader(prisma));
  const outbox = new SchedinaOutboxService(
    schedinaRepo,
    new SoapAlloggiatiSender(tokens, client),
    (id) => recordBuilder.build(id),
  );
  // Test-gate (intelligenza): dry-run Test prima dell'invio, le righe bocciate → NEEDS_REVIEW.
  const verify = new SchedinaVerifyService(schedinaRepo, tokens, client, (id) =>
    recordBuilder.build(id),
  );
  const reconcile = new SchedinaReconcileService(
    schedinaRepo,
    new SoapRicevutaSummaryReader(tokens, client),
  );

  const report = await runSendAndReconcile({
    // Solo credenziali ATTIVE con opt-in autoSend (oltre alla tripla barriera del gate).
    listActiveCredentialIds: () => credRepo.listAutoSendCredentialIds(),
    // Smart-send: Test → parcheggia le bocciate → invia solo le valide.
    send: (credentialId) =>
      verifyParkAndSend(
        {
          verify: (id) => verify.verifyCredentialBatch(id),
          parkByIds: (ids) => schedinaRepo.parkByIds(ids),
          send: (id) => outbox.processCredentialBatch(id),
        },
        credentialId,
      ).then(() => undefined),
    reconcile: (credentialId, dateIso) => reconcile.reconcileCredential(credentialId, dateIso),
    reconcileDateIso: romeYesterdayIso(),
  });

  return NextResponse.json({ ok: true, report });
}
