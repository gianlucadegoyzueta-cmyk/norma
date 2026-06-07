import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db";
import { hashCheckinToken, isCheckinTokenUsable } from "./policy";

/**
 * Token del link pubblico di check-in self-service. Sicurezza come PasswordResetToken:
 *  - token in chiaro casuale (256 bit), restituito SOLO per costruire l'URL da dare all'ospite;
 *  - a DB solo lo SHA-256 (`tokenHash`): un dump del DB non basta ad aprire un check-in;
 *  - a scadenza (`expiresAt`) e "chiuso" dopo l'invio (`completedAt`).
 * Le funzioni pure (hash, validità) vivono in ./policy.
 */
const CHECKIN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 giorni: l'ospite compila prima dell'arrivo

export { hashCheckinToken, isCheckinTokenUsable } from "./policy";

/** Crea un token di check-in per un soggiorno e ritorna il valore IN CHIARO (per l'URL). */
export async function createCheckinToken(stayId: string, organizationId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.checkinToken.create({
    data: {
      stayId,
      organizationId,
      tokenHash: hashCheckinToken(token),
      expiresAt: new Date(Date.now() + CHECKIN_TTL_MS),
    },
  });
  return token;
}

export interface CheckinContext {
  tokenId: string;
  stayId: string;
  organizationId: string;
}

/** Risolve un token in chiaro nel contesto del soggiorno, o null se assente/scaduto/già completato. */
export async function resolveCheckinToken(token: string): Promise<CheckinContext | null> {
  const row = await prisma.checkinToken.findUnique({
    where: { tokenHash: hashCheckinToken(token) },
  });
  if (!row || !isCheckinTokenUsable(row)) return null;
  return { tokenId: row.id, stayId: row.stayId, organizationId: row.organizationId };
}

/** Chiude il token dopo che l'ospite ha completato il check-in. */
export async function markCheckinCompleted(tokenId: string): Promise<void> {
  await prisma.checkinToken.update({ where: { id: tokenId }, data: { completedAt: new Date() } });
}
