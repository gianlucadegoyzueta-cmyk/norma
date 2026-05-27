import type { PrismaClient } from "@prisma/client";
import type { ParsedCode, ParsedComune } from "../domain/reference";
import type { ReferenceCounts, ReferenceTableRepository } from "../ports/reference";

// Inserimento a blocchi: i Comuni sono migliaia, e `createMany` fa UN round-trip per blocco.
const CHUNK = 2000;

function chunk<T>(rows: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/**
 * Adapter Prisma delle tabelle di riferimento.
 *
 * Idempotenza: `createMany({ skipDuplicates: true })` sulla chiave UNIQUE `code` → rieseguire la
 * sync NON crea doppioni e converge allo stesso insieme. Restituisce il numero di righe NUOVE
 * inserite (le righe già presenti vengono saltate).
 *
 * NOTA: con `skipDuplicates` le righe ESISTENTI non vengono aggiornate (es. un nome cambiato). È
 * accettabile per codici stabili come questi; se in futuro servisse aggiornare anche i nomi su
 * re-sync, si passerà a un upsert per-riga o a un INSERT ... ON CONFLICT DO UPDATE.
 */
export class PrismaReferenceTableRepository implements ReferenceTableRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertComuni(rows: readonly ParsedComune[]): Promise<number> {
    let inserted = 0;
    for (const part of chunk(rows, CHUNK)) {
      const { count } = await this.prisma.comune.createMany({
        data: part.map((r) => ({ code: r.code, name: r.name, provincia: r.provincia })),
        skipDuplicates: true,
      });
      inserted += count;
    }
    return inserted;
  }

  async upsertCountries(rows: readonly ParsedCode[]): Promise<number> {
    let inserted = 0;
    for (const part of chunk(rows, CHUNK)) {
      const { count } = await this.prisma.country.createMany({
        data: part.map((r) => ({ code: r.code, name: r.name })),
        skipDuplicates: true,
      });
      inserted += count;
    }
    return inserted;
  }

  async upsertDocumentTypes(rows: readonly ParsedCode[]): Promise<number> {
    let inserted = 0;
    for (const part of chunk(rows, CHUNK)) {
      const { count } = await this.prisma.documentType.createMany({
        data: part.map((r) => ({ code: r.code, name: r.name })),
        skipDuplicates: true,
      });
      inserted += count;
    }
    return inserted;
  }

  async counts(): Promise<ReferenceCounts> {
    const [comuni, countries, documentTypes] = await Promise.all([
      this.prisma.comune.count(),
      this.prisma.country.count(),
      this.prisma.documentType.count(),
    ]);
    return { comuni, countries, documentTypes };
  }
}
