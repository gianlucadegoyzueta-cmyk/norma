import type { PrismaClient } from "@prisma/client";
import { type ReferenceTables, type ResolverGuest, createReferenceTables } from "../domain/resolver";
import type { ReferenceTablesLoader } from "../ports/ReferenceTablesLoader";

/**
 * Carica dal DB SOLO i codici di riferimento usati dagli ospiti dati (per id), poi costruisce un
 * `ReferenceTables` in memoria. Il luogo di rilascio documento può essere un Comune o uno Stato:
 * lo si cerca in entrambe le tabelle (gli id sono cuid globalmente unici).
 */
export class PrismaReferenceTablesLoader implements ReferenceTablesLoader {
  constructor(private readonly prisma: PrismaClient) {}

  async loadForGuests(guests: (ResolverGuest & { id: string })[]): Promise<ReferenceTables> {
    const comuneIds = new Set<string>();
    const countryIds = new Set<string>();
    const documentTypeIds = new Set<string>();
    for (const g of guests) {
      countryIds.add(g.birthCountryId);
      countryIds.add(g.citizenshipId);
      if (g.birthComuneId) comuneIds.add(g.birthComuneId);
      if (g.documentTypeId) documentTypeIds.add(g.documentTypeId);
      if (g.documentPlaceId) {
        comuneIds.add(g.documentPlaceId);
        countryIds.add(g.documentPlaceId);
      }
    }
    const [comuni, countries, documentTypes] = await Promise.all([
      this.prisma.comune.findMany({
        where: { id: { in: [...comuneIds] } },
        select: { id: true, code: true, provincia: true },
      }),
      this.prisma.country.findMany({
        where: { id: { in: [...countryIds] } },
        select: { id: true, code: true },
      }),
      this.prisma.documentType.findMany({
        where: { id: { in: [...documentTypeIds] } },
        select: { id: true, code: true },
      }),
    ]);
    return createReferenceTables({ comuni, countries, documentTypes });
  }
}
