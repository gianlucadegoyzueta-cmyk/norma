import { createHash } from "node:crypto";

/**
 * Logica PURA del token di check-in (nessun DB): hashing e regola di validità.
 * Separata da token.ts (che usa Prisma) così è testabile senza l'alias runtime.
 */

export function hashCheckinToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** True se il token è ancora utilizzabile (non completato e non scaduto). */
export function isCheckinTokenUsable(
  row: { completedAt: Date | null; expiresAt: Date },
  now: number = Date.now(),
): boolean {
  return row.completedAt === null && row.expiresAt.getTime() > now;
}
