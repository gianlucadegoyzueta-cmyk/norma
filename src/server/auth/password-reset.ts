import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/server/db";

/**
 * Token di reset password ("password dimenticata"). Proprietà di sicurezza:
 *  - il token in chiaro è generato casuale (256 bit) e restituito SOLO per spedirlo via email;
 *  - a DB salviamo solo lo SHA-256 (`tokenHash`): un dump del DB non basta a forzare un reset;
 *  - monouso (`usedAt`) e a scadenza breve (`expires`).
 */
const RESET_TTL_MS = 1000 * 60 * 30; // 30 minuti

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Crea un token di reset per l'utente e restituisce il valore IN CHIARO (da inviare via email). */
export async function createPasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expires: new Date(Date.now() + RESET_TTL_MS),
    },
  });
  return token;
}

/**
 * Valida e CONSUMA un token (lo marca usato in modo atomico). Restituisce lo userId se valido,
 * altrimenti null (inesistente / già usato / scaduto). L'atomicità di `updateMany` con i filtri
 * evita che due richieste concorrenti riescano entrambe a usarlo.
 */
export async function consumePasswordResetToken(token: string): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(token);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expires.getTime() < Date.now()) return null;

  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null; // un'altra richiesta l'ha già consumato

  return { userId: row.userId };
}
