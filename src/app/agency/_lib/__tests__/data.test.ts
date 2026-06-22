import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { FIRENZE, ROMA } from "@/server/modules/tourist-tax/domain/seed-data";
import { getAgencyOverview } from "../data";

/**
 * Regressione KPI TASSA DI SOGGIORNO della vista d'agenzia.
 *
 * Il periodo di dichiarazione è CONFIGURABILE per comune (mensile/trimestrale/annuale). Il bug:
 * `getAgencyOverview` risolveva la tassa solo sul periodo "QUARTERLY", così per un comune con
 * dichiarazione MENSILE (o annuale) la KPI mostrava €0 pur con imposta reale. Questi test usano un
 * fake di PrismaClient che ONORA il filtro per periodo: contro il vecchio codice (period hard-coded
 * "QUARTERLY") la KPI del comune mensile risulterebbe zero e il test fallirebbe.
 *
 * `now` fisso a 2026-05-20 → periodo mensile atteso "2026-05", trimestrale "2026-Q2".
 */

type Row = Record<string, unknown>;
const NOW = new Date("2026-05-20T10:00:00Z");

interface World {
  properties: Row[];
  touristTaxConfigs: Row[];
  declarations: Row[]; // { id, organizationId, comuneId, period }
  declarationLines: Row[]; // { declarationId, stayId, amountCents }
  stays: Row[]; // { id, organizationId, propertyId }
}

/**
 * Fake di PrismaClient sufficiente per `getAgencyOverview`. Le letture filtrano per
 * `organizationId` dov'è atteso (isolamento multi-tenant) e per il periodo nelle righe tassa, così
 * il test riflette il comportamento reale del filtro su (comuneId, period).
 */
function fakePrisma(world: World): PrismaClient {
  return {
    property: {
      findMany: async ({ where }: { where: Row }) =>
        world.properties
          .filter((p) => p.organizationId === where.organizationId)
          .map((p) => ({
            id: p.id,
            name: p.name,
            proprietario: p.proprietario,
            credentialId: p.credentialId ?? null,
            cinStatus: p.cinStatus,
            ross1000Code: p.ross1000Code ?? null,
            comuneId: p.comuneId,
            comune: p.comune,
          })),
    },
    touristTaxConfig: {
      findMany: async ({ where }: { where: Row }) =>
        world.touristTaxConfigs
          .filter((c) => c.comuneId === where.comuneId)
          .map((c) => ({ validFrom: c.validFrom, validTo: c.validTo, rules: c.rules })),
    },
    schedina: {
      findMany: async () => [],
    },
    stay: {
      findMany: async ({ where }: { where: Row }) => {
        // Check-in di oggi (con vincolo checkinTokens) → nessuno in questi test.
        if (where.checkinTokens) return [];
        // stayId → propertyId per le righe tassa.
        const idIn = (where.id as { in?: string[] } | undefined)?.in;
        return world.stays
          .filter((s) => s.organizationId === where.organizationId)
          .filter((s) => (idIn ? idIn.includes(s.id as string) : true))
          .map((s) => ({ id: s.id, propertyId: s.propertyId }));
      },
    },
    touristTaxDeclarationLine: {
      findMany: async ({ where }: { where: Row }) => {
        const filters = (where.declaration as { OR?: Row[] }).OR ?? [];
        const matchedDeclIds = new Set(
          world.declarations
            .filter((d) =>
              filters.some(
                (f) =>
                  f.organizationId === d.organizationId &&
                  f.comuneId === d.comuneId &&
                  f.period === d.period,
              ),
            )
            .map((d) => d.id),
        );
        return world.declarationLines
          .filter((l) => matchedDeclIds.has(l.declarationId))
          .map((l) => ({ amountCents: l.amountCents, stayId: l.stayId }));
      },
    },
  } as unknown as PrismaClient;
}

/** Comune con regola valida alla data NOW (validFrom passato, validTo null). */
function configRow(comuneId: string, rule: unknown): Row {
  return { comuneId, validFrom: new Date("2024-01-01T00:00:00Z"), validTo: null, rules: rule };
}

describe("getAgencyOverview — KPI tassa di soggiorno per periodo del comune", () => {
  it("comune con dichiarazione MENSILE e imposta>0 → KPI tassa NON zero", async () => {
    const world: World = {
      properties: [
        {
          id: "prop-fi",
          organizationId: "orgA",
          name: "Loft Oltrarno",
          proprietario: "Mario Rossi",
          credentialId: "cred1",
          cinStatus: "OBTAINED",
          ross1000Code: "FI-001",
          comuneId: "comune-firenze",
          comune: { name: "Firenze", provincia: "FI" },
        },
      ],
      // Firenze: dichiarazione MENSILE → periodo atteso "2026-05".
      touristTaxConfigs: [configRow("comune-firenze", FIRENZE.rule)],
      declarations: [
        { id: "decl-fi", organizationId: "orgA", comuneId: "comune-firenze", period: "2026-05" },
      ],
      declarationLines: [{ declarationId: "decl-fi", stayId: "stay-fi", amountCents: 1800 }],
      stays: [{ id: "stay-fi", organizationId: "orgA", propertyId: "prop-fi" }],
    };

    const overview = await getAgencyOverview(fakePrisma(world), "orgA", NOW);

    expect(overview.totals.taxAccruedCents).toBe(1800);
    expect(overview.totals.taxAccruedCents).toBeGreaterThan(0);
    const row = overview.rows.find((r) => r.propertyId === "prop-fi");
    expect(row?.taxAccruedCents).toBe(1800);
  });

  it("mix mensile (Firenze) + trimestrale (Roma): somma entrambi i periodi corretti", async () => {
    const world: World = {
      properties: [
        {
          id: "prop-fi",
          organizationId: "orgA",
          name: "Loft Oltrarno",
          proprietario: "Mario Rossi",
          credentialId: "cred1",
          cinStatus: "OBTAINED",
          ross1000Code: "FI-001",
          comuneId: "comune-firenze",
          comune: { name: "Firenze", provincia: "FI" },
        },
        {
          id: "prop-rm",
          organizationId: "orgA",
          name: "Bilocale Trastevere",
          proprietario: "Lucia Bianchi",
          credentialId: "cred2",
          cinStatus: "OBTAINED",
          ross1000Code: "RM-001",
          comuneId: "comune-roma",
          comune: { name: "Roma", provincia: "RM" },
        },
      ],
      touristTaxConfigs: [
        configRow("comune-firenze", FIRENZE.rule), // MENSILE → "2026-05"
        configRow("comune-roma", ROMA.rule), // TRIMESTRALE → "2026-Q2"
      ],
      declarations: [
        { id: "decl-fi", organizationId: "orgA", comuneId: "comune-firenze", period: "2026-05" },
        { id: "decl-rm", organizationId: "orgA", comuneId: "comune-roma", period: "2026-Q2" },
      ],
      declarationLines: [
        { declarationId: "decl-fi", stayId: "stay-fi", amountCents: 1800 },
        { declarationId: "decl-rm", stayId: "stay-rm", amountCents: 1200 },
      ],
      stays: [
        { id: "stay-fi", organizationId: "orgA", propertyId: "prop-fi" },
        { id: "stay-rm", organizationId: "orgA", propertyId: "prop-rm" },
      ],
    };

    const overview = await getAgencyOverview(fakePrisma(world), "orgA", NOW);

    expect(overview.totals.taxAccruedCents).toBe(3000);
    const byId = new Map(overview.rows.map((r) => [r.propertyId, r]));
    expect(byId.get("prop-fi")?.taxAccruedCents).toBe(1800);
    expect(byId.get("prop-rm")?.taxAccruedCents).toBe(1200);
  });
});
