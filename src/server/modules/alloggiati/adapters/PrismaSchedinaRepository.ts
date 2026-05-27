import { Prisma } from "@prisma/client";
import type { PrismaClient, SchedinaStatus } from "@prisma/client";
import { computeDedupKey } from "../domain/dedup";
import { assertValidTransition, type StatusDecision } from "../domain/transitions";
import type {
  CreateIntentInput,
  CreateIntentResult,
  SchedinaRecord,
  SchedinaRepository,
} from "../ports/SchedinaRepository";

const SELECT = {
  id: true,
  organizationId: true,
  credentialId: true,
  status: true,
  dedupKey: true,
} satisfies Prisma.SchedinaSelect;

/**
 * Adapter Prisma/Postgres del repository delle schedine.
 *  - createIntent è IDEMPOTENTE: intercetta la violazione del vincolo UNIQUE
 *    (organizationId, dedupKey) [errore P2002] e restituisce la riga esistente,
 *    invece di creare un doppione.
 *  - ogni transizione è validata (assertValidTransition) e tracciata con un
 *    SchedinaEvent, il tutto dentro una transazione DB.
 */
export class PrismaSchedinaRepository implements SchedinaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const dedupKey = computeDedupKey(input.dedup);
    try {
      const schedina = await this.prisma.schedina.create({
        data: {
          organizationId: input.organizationId,
          credentialId: input.credentialId,
          guestId: input.guestId,
          dedupKey,
          deadlineAt: input.deadlineAt,
        },
        select: SELECT,
      });
      return { schedina, created: true };
    } catch (e) {
      // P2002 = violazione UNIQUE → l'intento esiste già: restituiamo quello.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const existing = await this.prisma.schedina.findUnique({
          where: { organizationId_dedupKey: { organizationId: input.organizationId, dedupKey } },
          select: SELECT,
        });
        if (existing) return { schedina: existing, created: false };
      }
      throw e;
    }
  }

  async findById(id: string): Promise<SchedinaRecord | null> {
    return this.prisma.schedina.findUnique({ where: { id }, select: SELECT });
  }

  async listPendingByCredential(credentialId: string): Promise<SchedinaRecord[]> {
    return this.prisma.schedina.findMany({
      where: { credentialId, status: "PENDING" },
      select: SELECT,
    });
  }

  async markSending(id: string): Promise<void> {
    await this.transition(id, "SENDING", null, null);
  }

  async setPayloadSnapshot(id: string, payloadSnapshot: string): Promise<void> {
    await this.prisma.schedina.update({ where: { id }, data: { payloadSnapshot } });
  }

  async applyDecision(id: string, decision: StatusDecision): Promise<void> {
    await this.transition(id, decision.status, decision.errorCod, decision.errorDes);
  }

  /** Transizione validata + evento di audit, in un'unica transazione. */
  private async transition(
    id: string,
    to: SchedinaStatus,
    errorCod: string | null,
    errorDes: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.schedina.findUnique({ where: { id }, select: { status: true } });
      if (!current) throw new Error(`Schedina non trovata: ${id}`);
      assertValidTransition(current.status, to);

      const data: Prisma.SchedinaUpdateInput = { status: to };
      if (to === "SENDING") {
        data.sentAt = new Date();
        data.attempts = { increment: 1 };
      } else if (to === "ACQUIRED") {
        data.acquiredAt = new Date();
        data.lastErrorCod = null;
        data.lastErrorDes = null;
      } else if (to === "REJECTED") {
        data.lastErrorCod = errorCod;
        data.lastErrorDes = errorDes;
      }

      await tx.schedina.update({ where: { id }, data });
      await tx.schedinaEvent.create({
        data: { schedinaId: id, fromStatus: current.status, toStatus: to, message: errorDes },
      });
    });
  }
}
