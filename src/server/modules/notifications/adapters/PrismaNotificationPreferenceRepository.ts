import type { PrismaClient } from "@prisma/client";
import type { NotificationConsent, NotificationPreferenceRepository, Pillar } from "../ports";

/** Tabella `NotificationPreference` assente (migrazione non applicata)? Codice Prisma P2021. */
function isMissingTableError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2021"
  );
}

/** Default opt-in: senza una riga esplicita (o senza tabella) l'host riceve gli alert. */
const DEFAULT_CONSENT: NotificationConsent = { alloggiati: true, turismo: true };

/**
 * Persistenza Prisma del consenso per-pilastro. Degrada al default opt-in se la migrazione non
 * è applicata (P2021) o se non esiste ancora una riga per l'utente.
 */
export class PrismaNotificationPreferenceRepository implements NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(userId: string): Promise<NotificationConsent> {
    try {
      const row = await this.prisma.notificationPreference.findUnique({
        where: { userId },
        select: { alloggiati: true, turismo: true },
      });
      return row ?? { ...DEFAULT_CONSENT };
    } catch (err) {
      if (isMissingTableError(err)) return { ...DEFAULT_CONSENT };
      throw err;
    }
  }

  async set(userId: string, pillar: Pillar, enabled: boolean): Promise<void> {
    // Chiave esplicita (non calcolata) per restare dentro i tipi `create/update` di Prisma.
    const data = pillar === "alloggiati" ? { alloggiati: enabled } : { turismo: enabled };
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
