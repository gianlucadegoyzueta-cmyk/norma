// Adapter Prisma del modulo Digest: traduce le query in conteggi. Nessuna logica di composizione
// qui (sta nel dominio): solo "query → numeri". Tutte le query sono filtrate per organizationId
// (isolamento tenant), come ovunque nel codice.

import type { PrismaClient } from "@prisma/client";
import { isValidEmail } from "../../notifications";
import type { DigestRepository, OrgDigestTarget, WeeklyDigestFacts, WeekWindow } from "../ports";

/** 7 giorni in millisecondi: orizzonte degli "arrivi imminenti". */
const NEXT_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export class PrismaDigestRepository implements DigestRepository {
  constructor(
    private readonly prisma: PrismaClient,
    /** Iniettabile per i test; di default è il momento della chiamata. */
    private readonly now: () => Date = () => new Date(),
  ) {}

  async listTargets(): Promise<OrgDigestTarget[]> {
    // Solo OWNER/ADMIN ricevono il digest (è un riepilogo gestionale, non per i semplici MEMBER).
    const orgs = await this.prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        memberships: {
          where: { role: { in: ["OWNER", "ADMIN"] } },
          select: { user: { select: { email: true, name: true } } },
        },
      },
    });

    return orgs
      .map((org) => ({
        organizationId: org.id,
        orgName: org.name,
        recipients: dedupeRecipients(
          org.memberships
            .map((m) => ({ email: m.user.email, name: m.user.name }))
            .filter((r) => isValidEmail(r.email)),
        ),
      }))
      .filter((t) => t.recipients.length > 0);
  }

  async gatherWeekly(organizationId: string, window: WeekWindow): Promise<WeeklyDigestFacts> {
    const now = this.now();
    const soon = new Date(now.getTime() + NEXT_DAYS_MS);
    const inWeek = { gte: window.start, lt: window.end };

    const [
      schedineAcquired,
      checkinsCompleted,
      staysAdded,
      taxDeclared,
      schedinePending,
      arrivalsNext7Days,
      checkinsAwaiting,
      overdue,
      needsReview,
    ] = await Promise.all([
      this.prisma.schedina.count({
        where: { organizationId, status: "ACQUIRED", acquiredAt: inWeek },
      }),
      this.prisma.checkinToken.count({
        where: { organizationId, completedAt: inWeek },
      }),
      this.prisma.stay.count({
        where: { organizationId, createdAt: inWeek },
      }),
      this.prisma.touristTaxDeclaration.count({
        where: { organizationId, submittedAt: inWeek },
      }),
      this.prisma.schedina.count({
        where: { organizationId, status: { in: ["PENDING", "NEEDS_REVIEW"] } },
      }),
      this.prisma.stay.count({
        where: { organizationId, arrivalDate: { gte: now, lt: soon } },
      }),
      this.prisma.checkinToken.count({
        where: {
          organizationId,
          completedAt: null,
          expiresAt: { gt: now },
          stay: { arrivalDate: { gte: now, lt: soon } },
        },
      }),
      this.prisma.schedina.count({
        where: {
          organizationId,
          deadlineAt: { lt: now },
          status: { in: ["PENDING", "SENDING", "REJECTED", "UNVERIFIED", "NEEDS_REVIEW"] },
        },
      }),
      this.prisma.schedina.count({
        where: { organizationId, status: "NEEDS_REVIEW" },
      }),
    ]);

    return {
      done: { schedineAcquired, checkinsCompleted, staysAdded, taxDeclared },
      upcoming: { schedinePending, arrivalsNext7Days, checkinsAwaiting },
      position: { overdue, needsReview },
    };
  }
}

/** Stesso indirizzo una sola volta (un utente può essere OWNER e ADMIN? no, ma per sicurezza). */
function dedupeRecipients<T extends { email: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = item.email.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
