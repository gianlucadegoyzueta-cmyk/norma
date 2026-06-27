import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { getSecretsVault } from "@/server/secrets";
import {
  FcmPushSender,
  PrismaDeviceTokenRepository,
  PrismaNotificationPreferenceRepository,
  PushNotificationService,
} from "@/server/modules/notifications";
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

  const smartDeps = {
    verify: (id: string) => verify.verifyCredentialBatch(id),
    parkByIds: (ids: readonly string[]) => schedinaRepo.parkByIds(ids),
    send: (id: string) => outbox.processCredentialBatch(id),
  };
  const parkedByCredential = new Map<string, number>();

  // DRY-RUN ("finto, senza rischi"): esegue il Test REALE contro l'endpoint Alloggiati e riporta cosa
  // invierebbe/parcheggerebbe, MA non parcheggia, non invia, non riconcilia → zero mutazioni, zero
  // acquisizione. Per validare la pipeline su dati reali prima del primo Send vero. Attivo se
  // ALLOGGIATI_CRON_DRY_RUN === "true" (oltre al gate). Resiliente per-credenziale.
  if (process.env.ALLOGGIATI_CRON_DRY_RUN === "true") {
    const ids = await credRepo.listAutoSendCredentialIds();
    const results: unknown[] = [];
    for (const id of ids) {
      try {
        results.push(await verifyParkAndSend(smartDeps, id, { dryRun: true }));
      } catch (err) {
        results.push({ credentialId: id, error: err instanceof Error ? err.message : "errore" });
      }
    }
    return NextResponse.json({ ok: true, dryRun: true, credentials: ids.length, results });
  }

  const report = await runSendAndReconcile({
    // Solo credenziali ATTIVE con opt-in autoSend (oltre alla tripla barriera del gate).
    listActiveCredentialIds: () => credRepo.listAutoSendCredentialIds(),
    // Smart-send: Test → parcheggia le bocciate → invia solo le valide.
    send: async (credentialId) => {
      const out = await verifyParkAndSend(smartDeps, credentialId);
      parkedByCredential.set(credentialId, out.parked);
    },
    reconcile: (credentialId, dateIso) => reconcile.reconcileCredential(credentialId, dateIso),
    reconcileDateIso: romeYesterdayIso(),
  });

  // Push NEEDS_REVIEW: se il Test notturno ha parcheggiato righe, avvisa OWNER/ADMIN dell'org.
  const needsReviewCredentialIds = [...parkedByCredential.entries()]
    .filter(([, parked]) => parked > 0)
    .map(([credentialId]) => credentialId);
  if (needsReviewCredentialIds.length > 0) {
    const creds = await prisma.alloggiatiCredential.findMany({
      where: { id: { in: needsReviewCredentialIds } },
      select: { id: true, organizationId: true },
    });
    const orgIds = [...new Set(creds.map((c) => c.organizationId))];
    const members = await prisma.membership.findMany({
      where: { organizationId: { in: orgIds }, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    });
    const userIds = [...new Set(members.map((m) => m.userId))];
    const pushService = new PushNotificationService(
      new FcmPushSender(),
      new PrismaDeviceTokenRepository(prisma),
      new PrismaNotificationPreferenceRepository(prisma),
    );
    await Promise.allSettled(
      userIds.map((userId) =>
        pushService.notify(userId, "alloggiati", {
          title: "Schedine da correggere",
          body: "Il test notturno ha trovato righe da rivedere prima dell'invio.",
          data: { path: "/schedine" },
        }),
      ),
    );
  }

  return NextResponse.json({ ok: true, report });
}
