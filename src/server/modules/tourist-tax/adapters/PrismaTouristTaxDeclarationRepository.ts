import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  DeclarationLineRecord,
  DeclarationPatch,
  DeclarationRecord,
  StayInPeriod,
  TouristTaxDeclarationRepository,
  UpsertDeclarationInput,
} from "../ports/TouristTaxDeclarationRepository";

export class PrismaTouristTaxDeclarationRepository implements TouristTaxDeclarationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findStaysInPeriod(
    organizationId: string,
    comuneId: string,
    start: Date,
    end: Date,
  ): Promise<StayInPeriod[]> {
    // v1: un soggiorno appartiene al periodo se la DATA DI ARRIVO ci ricade (no split a cavallo).
    const stays = await this.prisma.stay.findMany({
      where: {
        organizationId,
        arrivalDate: { gte: start, lt: end },
        property: { comuneId },
      },
      select: {
        id: true,
        arrivalDate: true,
        departureDate: true,
        property: {
          select: { name: true, comuneId: true, accommodationCategory: true, touristTaxZone: true },
        },
        guests: { select: { id: true, birthDate: true, taxExemptionType: true } },
      },
    });
    return stays.map((s) => ({
      stayId: s.id,
      propertyName: s.property.name,
      comuneId: s.property.comuneId,
      arrivalDate: s.arrivalDate,
      departureDate: s.departureDate,
      accommodationCategory: s.property.accommodationCategory,
      touristTaxZone: s.property.touristTaxZone,
      guests: s.guests.map((g) => ({
        id: g.id,
        birthDate: g.birthDate,
        taxExemptionType: g.taxExemptionType,
      })),
    }));
  }

  async upsertDeclarationWithLines(input: UpsertDeclarationInput): Promise<DeclarationRecord> {
    return this.prisma.$transaction(async (tx) => {
      const decl = await tx.touristTaxDeclaration.upsert({
        where: {
          organizationId_comuneId_period: {
            organizationId: input.organizationId,
            comuneId: input.comuneId,
            period: input.period,
          },
        },
        create: {
          organizationId: input.organizationId,
          comuneId: input.comuneId,
          period: input.period,
          amountCents: input.amountCents,
          normaTakeRateBps: input.normaTakeRateBps,
          normaFeeCents: input.normaFeeCents,
          comuneNetCents: input.comuneNetCents,
        },
        update: {
          amountCents: input.amountCents,
          normaTakeRateBps: input.normaTakeRateBps,
          normaFeeCents: input.normaFeeCents,
          comuneNetCents: input.comuneNetCents,
        },
      });
      await tx.touristTaxDeclarationLine.deleteMany({ where: { declarationId: decl.id } });
      if (input.lines.length > 0) {
        await tx.touristTaxDeclarationLine.createMany({
          data: input.lines.map((l) => ({
            declarationId: decl.id,
            stayId: l.stayId,
            propertyName: l.propertyName,
            taxedNights: l.taxedNights,
            amountCents: l.amountCents,
            breakdown: l.breakdown as unknown as Prisma.InputJsonValue,
          })),
        });
      }
      return toRecord(decl);
    });
  }

  async listDeclarations(organizationId: string): Promise<DeclarationRecord[]> {
    const rows = await this.prisma.touristTaxDeclaration.findMany({
      where: { organizationId },
      orderBy: [{ period: "desc" }, { comuneId: "asc" }],
    });
    return rows.map(toRecord);
  }

  async getDeclaration(id: string, organizationId: string): Promise<DeclarationRecord | null> {
    const row = await this.prisma.touristTaxDeclaration.findFirst({
      where: { id, organizationId },
    });
    return row ? toRecord(row) : null;
  }

  async getDeclarationLines(id: string, organizationId: string): Promise<DeclarationLineRecord[]> {
    const decl = await this.prisma.touristTaxDeclaration.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!decl) return [];
    const lines = await this.prisma.touristTaxDeclarationLine.findMany({
      where: { declarationId: decl.id },
      orderBy: { propertyName: "asc" },
    });
    return lines.map((l) => ({
      stayId: l.stayId,
      propertyName: l.propertyName,
      taxedNights: l.taxedNights,
      amountCents: l.amountCents,
    }));
  }

  async updateDeclaration(
    id: string,
    organizationId: string,
    patch: DeclarationPatch,
  ): Promise<void> {
    // updateMany con guardia organizationId: un id di un'altra org non aggiorna nulla.
    await this.prisma.touristTaxDeclaration.updateMany({
      where: { id, organizationId },
      data: patch,
    });
  }
}

function toRecord(row: {
  id: string;
  organizationId: string;
  comuneId: string;
  period: string;
  amountCents: number;
  normaTakeRateBps: number;
  normaFeeCents: number;
  comuneNetCents: number;
  status: DeclarationRecord["status"];
  remittanceMode: DeclarationRecord["remittanceMode"];
}): DeclarationRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    comuneId: row.comuneId,
    period: row.period,
    amountCents: row.amountCents,
    normaTakeRateBps: row.normaTakeRateBps,
    normaFeeCents: row.normaFeeCents,
    comuneNetCents: row.comuneNetCents,
    status: row.status,
    remittanceMode: row.remittanceMode,
  };
}
