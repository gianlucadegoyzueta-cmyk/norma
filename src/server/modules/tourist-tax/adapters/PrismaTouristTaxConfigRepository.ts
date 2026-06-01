// Adapter Prisma del TouristTaxConfigRepository.
// La selezione della versione valida per data è delegata alla funzione PURA selectVersionAt,
// così la logica temporale è testabile senza DB.

import type { PrismaClient } from "@prisma/client";
import { parseTouristTaxRule, type TouristTaxRule } from "../domain/rule";
import { selectVersionAt } from "../domain/version-select";
import type {
  TouristTaxConfigRepository,
  TouristTaxConfigVersion,
  UpsertTouristTaxConfigInput,
} from "../ports/TouristTaxConfigRepository";

export class PrismaTouristTaxConfigRepository implements TouristTaxConfigRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findRuleForDate(comuneId: string, date: Date): Promise<TouristTaxRule | null> {
    const rows = await this.prisma.touristTaxConfig.findMany({
      where: { comuneId },
      select: { validFrom: true, validTo: true, rules: true },
    });
    // Parsing/validazione della regola SOLO sulla versione scelta (le altre potrebbero essere
    // versioni vecchie con forme diverse): selezioniamo prima, poi validiamo.
    const selected = selectVersionAt(
      rows.map((r) => ({ validFrom: r.validFrom, validTo: r.validTo, value: r.rules })),
      date,
    );
    if (selected === null) return null;
    return parseTouristTaxRule(selected);
  }

  async listVersions(comuneId: string): Promise<TouristTaxConfigVersion[]> {
    const rows = await this.prisma.touristTaxConfig.findMany({
      where: { comuneId },
      orderBy: { validFrom: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      comuneId: r.comuneId,
      validFrom: r.validFrom,
      validTo: r.validTo,
      rule: parseTouristTaxRule(r.rules),
    }));
  }

  async upsertVersion(input: UpsertTouristTaxConfigInput): Promise<TouristTaxConfigVersion> {
    // Valida la regola PRIMA di persistere: una regola malformata non entra mai a DB.
    const rule = parseTouristTaxRule(input.rule);
    const row = await this.prisma.touristTaxConfig.upsert({
      where: { comuneId_validFrom: { comuneId: input.comuneId, validFrom: input.validFrom } },
      create: {
        comuneId: input.comuneId,
        validFrom: input.validFrom,
        validTo: input.validTo ?? null,
        rules: rule as unknown as object,
      },
      update: {
        validTo: input.validTo ?? null,
        rules: rule as unknown as object,
      },
    });
    return {
      id: row.id,
      comuneId: row.comuneId,
      validFrom: row.validFrom,
      validTo: row.validTo,
      rule,
    };
  }
}
