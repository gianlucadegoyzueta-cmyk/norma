import { Prisma } from "@prisma/client";
import type { PrismaClient, SchedinaStatus, SubmissionChannel } from "@prisma/client";
import { computeDedupKey } from "../domain/dedup";
import { assertValidTransition, decideFromSendAttempt, type StatusDecision } from "../domain/transitions";
import type {
  CreateIntentInput,
  CreateIntentResult,
  SchedinaRecord,
  SchedinaRepository,
} from "../ports/SchedinaRepository";

/** Riga schedina come serve alla dashboard outbox (relazioni risolte). */
export interface SchedinaListItem {
  id: string;
  status: SchedinaStatus;
  channel: SubmissionChannel;
  guestName: string;
  propertyName: string;
  credentialId: string;
  credentialLabel: string;
  deadlineAt: Date;
  sentAt: Date | null;
  acquiredAt: Date | null;
  attempts: number;
  lastErrorCod: string | null;
  lastErrorDes: string | null;
}

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

  async findById(id: string, organizationId: string): Promise<SchedinaRecord | null> {
    // findFirst con (id, organizationId): un id di un'altra org → null. Isolamento a livello query.
    return this.prisma.schedina.findFirst({ where: { id, organizationId }, select: SELECT });
  }

  async listPendingByCredential(credentialId: string): Promise<SchedinaRecord[]> {
    return this.prisma.schedina.findMany({
      where: { credentialId, status: "PENDING" },
      select: SELECT,
    });
  }

  async listUnverifiedByCredential(credentialId: string): Promise<SchedinaRecord[]> {
    return this.prisma.schedina.findMany({
      where: { credentialId, status: "UNVERIFIED" },
      select: SELECT,
    });
  }

  async getPayloadSnapshot(id: string): Promise<string | null> {
    const row = await this.prisma.schedina.findUnique({
      where: { id },
      select: { payloadSnapshot: true },
    });
    return row?.payloadSnapshot ?? null;
  }

  /**
   * Elenco delle schedine di un'organizzazione per la dashboard outbox. Lettura di sola
   * visualizzazione (non fa parte del PORT, focalizzato sulla meccanica dell'invio).
   * Ordinato per scadenza crescente: le più urgenti in cima.
   */
  async listForOrganization(organizationId: string): Promise<SchedinaListItem[]> {
    const rows = await this.prisma.schedina.findMany({
      where: { organizationId },
      orderBy: { deadlineAt: "asc" },
      select: {
        id: true,
        status: true,
        channel: true,
        deadlineAt: true,
        sentAt: true,
        acquiredAt: true,
        attempts: true,
        lastErrorCod: true,
        lastErrorDes: true,
        credentialId: true,
        guest: {
          select: {
            firstName: true,
            lastName: true,
            stay: { select: { property: { select: { name: true } } } },
          },
        },
        credential: { select: { label: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      status: r.status,
      channel: r.channel,
      guestName: `${r.guest.lastName} ${r.guest.firstName}`,
      propertyName: r.guest.stay.property.name,
      credentialId: r.credentialId,
      credentialLabel: r.credential.label,
      deadlineAt: r.deadlineAt,
      sentAt: r.sentAt,
      acquiredAt: r.acquiredAt,
      attempts: r.attempts,
      lastErrorCod: r.lastErrorCod,
      lastErrorDes: r.lastErrorDes,
    }));
  }

  async markSending(id: string): Promise<void> {
    await this.transition(id, "SENDING", null, null);
  }

  /**
   * Claim atomico PENDING→SENDING. `updateMany` con guardia `status: PENDING` è la sezione critica:
   * il DB applica l'update a UNA sola transazione vincente (count 1); un invio concorrente vede
   * count 0 e salta la riga. Niente doppio invio anche con due batch paralleli sulla credenziale.
   * Registra `sentAt`/`attempts` e l'evento di audit SOLO se il claim è andato a buon fine.
   */
  async claimForSending(id: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const res = await tx.schedina.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "SENDING", sentAt: new Date(), attempts: { increment: 1 } },
      });
      if (res.count === 0) return false; // già rivendicata altrove, o non più PENDING
      await tx.schedinaEvent.create({
        data: { schedinaId: id, fromStatus: "PENDING", toStatus: "SENDING", message: null },
      });
      return true;
    });
  }

  async setPayloadSnapshot(id: string, payloadSnapshot: string): Promise<void> {
    await this.prisma.schedina.update({ where: { id }, data: { payloadSnapshot } });
  }

  async applyDecision(id: string, decision: StatusDecision): Promise<void> {
    await this.transition(id, decision.status, decision.errorCod, decision.errorDes);
  }

  async recoverStaleSending(credentialId: string, staleAfterMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - staleAfterMs);
    const stale = await this.prisma.schedina.findMany({
      where: {
        credentialId,
        status: "SENDING",
        sentAt: { lt: cutoff },
      },
      select: { id: true },
    });
    for (const row of stale) {
      await this.applyDecision(row.id, decideFromSendAttempt({ kind: "NO_RESPONSE" }));
    }
    return stale.length;
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
      // Uscita da UNVERIFIED = esito della riconciliazione T+1 (→ ACQUIRED confermata o → PENDING
      // ri-accodata): segna quando è avvenuto, per audit del controllo differito.
      if (current.status === "UNVERIFIED") {
        data.reconciledAt = new Date();
      }

      await tx.schedina.update({ where: { id }, data });
      await tx.schedinaEvent.create({
        data: { schedinaId: id, fromStatus: current.status, toStatus: to, message: errorDes },
      });
    });
  }
}
