import { prisma } from "@/server/db";
import type { TicketStore } from "../ports";
import type { NewTicket, OpenTicket, StoredTicket, SupportMessage } from "../support.types";

/** Persiste e legge i ticket di supporto su Postgres (Supabase) via Prisma. */
export class PrismaTicketStore implements TicketStore {
  async create(ticket: NewTicket): Promise<StoredTicket> {
    const row = await prisma.supportTicket.create({
      data: {
        organizationId: ticket.organizationId,
        question: ticket.question,
        // La conversazione è serializzata: snapshot per il follow-up umano, non query-abile.
        conversation: JSON.stringify(ticket.conversation),
      },
      select: { id: true },
    });
    return { id: row.id };
  }

  async listOpen(): Promise<OpenTicket[]> {
    const rows = await prisma.supportTicket.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        organizationId: true,
        question: true,
        conversation: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      organizationId: r.organizationId,
      question: r.question,
      conversation: parseConversation(r.conversation),
      createdAt: r.createdAt,
    }));
  }

  async close(id: string): Promise<void> {
    await prisma.supportTicket.update({
      where: { id },
      data: { status: "closed" },
    });
  }
}

/** La conversazione è salvata come JSON: la rileggiamo difensivamente (mai rompere l'inbox). */
function parseConversation(raw: string): SupportMessage[] {
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? (value as SupportMessage[]) : [];
  } catch {
    return [];
  }
}
