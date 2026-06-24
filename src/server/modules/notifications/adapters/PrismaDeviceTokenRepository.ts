import type { PrismaClient } from "@prisma/client";
import type { DeviceTokenRecord, DeviceTokenRepository } from "../ports";

/** Tabella `DeviceToken` assente (migrazione non ancora applicata)? Codice Prisma P2021. */
function isMissingTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2021"
  );
}

/**
 * Persistenza Prisma dei device token. Degrada con grazia se la migrazione non è ancora
 * applicata (P2021): la registrazione diventa no-op e la lista è vuota — così l'app non crasha
 * prima del go-live della PR2.
 */
export class PrismaDeviceTokenRepository implements DeviceTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async register(userId: string, device: DeviceTokenRecord): Promise<void> {
    try {
      await this.prisma.deviceToken.upsert({
        where: { token: device.token },
        create: { userId, token: device.token, platform: device.platform },
        update: { userId, platform: device.platform, lastSeenAt: new Date() },
      });
    } catch (err) {
      if (isMissingTableError(err)) return;
      throw err;
    }
  }

  async remove(token: string): Promise<void> {
    try {
      await this.prisma.deviceToken.deleteMany({ where: { token } });
    } catch (err) {
      if (isMissingTableError(err)) return;
      throw err;
    }
  }

  async listTokensForUser(userId: string): Promise<string[]> {
    try {
      const rows = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });
      return rows.map((r) => r.token);
    } catch (err) {
      if (isMissingTableError(err)) return [];
      throw err;
    }
  }
}
