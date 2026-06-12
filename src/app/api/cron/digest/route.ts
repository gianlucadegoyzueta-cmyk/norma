import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { ResendEmailSender } from "@/server/modules/notifications";
import {
  evaluateDigestGate,
  PrismaDigestRepository,
  previousWeekWindow,
  WeeklyDigestService,
} from "@/server/modules/digest";

// ✉️ DIGEST SETTIMANALE "FATTO DA NORMA" — DISATTIVATO DI DEFAULT.
//
// Email automatica in uscita (lunedì mattina) con il riepilogo della settimana. Gira SOLO se
// `DIGEST_ENABLED === "true"` (env Vercel) E con l'auth del cron Vercel (`Authorization: Bearer
// $CRON_SECRET`). Vedi digest/domain/cron-gate.ts per le due barriere.
//
// ⚠️ Il FLAG è SEPARATO e DISTINTO da quello degli invii Alloggiati (ALLOGGIATI_CRON_ENABLED):
// abilitare il digest NON tocca gli invii alla Questura, e viceversa. Sono due interruttori
// indipendenti. Questo è comunque email automatica → l'accensione è una decisione del founder.
//
// Per attivarlo (decisione umana, consapevole):
//   1. aggiungere la voce in vercel.json (crons) — vedi vercel.cron.digest.example.json in repo;
//   2. su Vercel impostare `CRON_SECRET` e `DIGEST_ENABLED=true`.
// Finché il flag è assente/≠"true", questa route è un no-op che risponde 200 {disabled:true}.

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const gate = evaluateDigestGate({
    enabledFlag: process.env.DIGEST_ENABLED,
    cronSecret: process.env.CRON_SECRET,
    authHeader: req.headers.get("authorization"),
  });

  if (gate.kind === "disabled") {
    return NextResponse.json({ ok: true, disabled: true });
  }
  if (gate.kind === "unauthorized") {
    return NextResponse.json({ ok: false, error: gate.reason }, { status: 401 });
  }

  // --- gate.kind === "run": cabla lo stack reale (repository Prisma + canale Resend esistente) ---
  const service = new WeeklyDigestService(
    new PrismaDigestRepository(prisma),
    new ResendEmailSender(),
  );
  const report = await service.run(previousWeekWindow(new Date()));

  return NextResponse.json({ ok: true, report });
}
