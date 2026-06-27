import { prisma } from "@/server/db";
import {
  BillingGatingService,
  PrismaGuestActivityRepository,
  PrismaSubscriptionRepository,
  WriteAccessDeniedError,
} from "./index";

type WriteAccessCheck = { ok: true } | { ok: false; message: string };

function isMissingTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2021"
  );
}

const gating = new BillingGatingService(
  new PrismaSubscriptionRepository(prisma),
  new PrismaGuestActivityRepository(prisma),
);

/**
 * Gate unico per le server action di scrittura: blocca quando l'org è EXPIRED.
 * Se la tabella Subscription manca (migrazione non applicata) non blocca, per
 * evitare regressioni in ambienti non migrati.
 */
export async function checkWriteAccess(organizationId: string): Promise<WriteAccessCheck> {
  try {
    await gating.requireWriteAccess(organizationId);
    return { ok: true };
  } catch (err) {
    if (err instanceof WriteAccessDeniedError) {
      return { ok: false, message: err.message };
    }
    if (isMissingTableError(err)) {
      return { ok: true };
    }
    throw err;
  }
}
