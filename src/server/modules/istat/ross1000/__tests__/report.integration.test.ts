import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadRoss1000Report } from "../report";

// Test di INTEGRAZIONE (DB reale). Si esegue SOLO con RUN_DB_TESTS=1 e DATABASE_URL/DIRECT_URL
// verso un DB con le migrazioni applicate (incl. ross1000_property_guest_fields). Altrimenti saltato.
// Verifica: happy path, disciplina "mai inventare" (missing[]), isolamento multi-tenant.
const runDb = process.env.RUN_DB_TESTS === "1";
const IT = "100000100"; // codice Stato Italia
const FR = "100000215"; // codice Stato estero (Francia)

describe.skipIf(!runDb)("loadRoss1000Report — integrazione (DB reale)", () => {
  let prisma: PrismaClient;

  const s = Date.now().toString();
  const PERIOD = "2026-06";
  const ARR = new Date("2026-06-10T12:00:00Z");
  const DEP = new Date("2026-06-12T12:00:00Z");
  const CODE = "A00927P";

  const ids = {
    orgA: `r1_orgA_${s}`,
    orgB: `r1_orgB_${s}`,
    comune: `r1_com_${s}`,
    itCountry: `r1_it_${s}`,
    frCountry: `r1_fr_${s}`,
    propComplete: `r1_pc_${s}`,
    propNoCap: `r1_pnc_${s}`,
    propNoCode: `r1_pncode_${s}`,
    propForeign: `r1_pf_${s}`,
    propFamiliare: `r1_pfam_${s}`,
  };

  async function makeProperty(
    id: string,
    organizationId: string,
    o: { code?: string | null; camere?: number | null; letti?: number | null },
  ) {
    await prisma.property.create({
      data: {
        id,
        organizationId,
        name: id,
        address: "Via 1",
        comuneId: ids.comune,
        proprietario: "X",
        ross1000Code: o.code ?? null,
        camereDisponibili: o.camere ?? null,
        lettiDisponibili: o.letti ?? null,
      },
    });
  }

  async function makeStayWithGuest(
    propertyId: string,
    organizationId: string,
    guest: Record<string, unknown>,
  ) {
    const stayId = `${propertyId}_stay`;
    await prisma.stay.create({
      data: {
        id: stayId,
        organizationId,
        propertyId,
        arrivalDate: ARR,
        departureDate: DEP,
        guestsCount: 1,
      },
    });
    await prisma.guest.create({
      data: {
        id: `${propertyId}_g`,
        organizationId,
        stayId,
        firstName: "Mario",
        lastName: "Rossi",
        sex: "M",
        birthDate: new Date("1990-05-20"),
        birthCountryId: ids.itCountry,
        citizenshipId: ids.itCountry,
        tipoAlloggiato: "OSPITE_SINGOLO",
        ...guest,
      },
    });
  }

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    prisma = new PrismaClient({ datasourceUrl: url });

    await prisma.organization.create({ data: { id: ids.orgA, name: "R1 A" } });
    await prisma.organization.create({ data: { id: ids.orgB, name: "R1 B" } });
    await prisma.comune.create({
      data: { id: ids.comune, code: `C${s}`, name: "Roma", provincia: "RM" },
    });
    await prisma.country.create({ data: { id: ids.itCountry, code: IT, name: "ITALIA" } });
    await prisma.country.create({ data: { id: ids.frCountry, code: FR, name: "FRANCIA" } });

    // Completo (residente Italia): tutto presente → OK
    await makeProperty(ids.propComplete, ids.orgA, { code: CODE, camere: 4, letti: 8 });
    await makeStayWithGuest(ids.propComplete, ids.orgA, {
      residenceCountryId: ids.itCountry,
      residenceComuneId: ids.comune,
      birthComuneId: ids.comune,
      tourismType: "ALTRO",
      transportMeans: "AUTO",
    });

    // Capacità mancante
    await makeProperty(ids.propNoCap, ids.orgA, { code: CODE, camere: null, letti: null });
    await makeStayWithGuest(ids.propNoCap, ids.orgA, {
      residenceCountryId: ids.itCountry,
      residenceComuneId: ids.comune,
      tourismType: "ALTRO",
      transportMeans: "AUTO",
    });

    // Codice struttura mancante
    await makeProperty(ids.propNoCode, ids.orgA, { code: null, camere: 4, letti: 8 });
    await makeStayWithGuest(ids.propNoCode, ids.orgA, {
      residenceCountryId: ids.itCountry,
      residenceComuneId: ids.comune,
      tourismType: "ALTRO",
      transportMeans: "AUTO",
    });

    // Residente ESTERO: nessuna sorgente per luogoresidenza → missing
    await makeProperty(ids.propForeign, ids.orgA, { code: CODE, camere: 4, letti: 8 });
    await makeStayWithGuest(ids.propForeign, ids.orgA, {
      residenceCountryId: ids.frCountry, // estero
      residenceComuneId: null,
      tourismType: "ALTRO",
      transportMeans: "AUTO",
    });

    // FAMILIARE senza capogruppo → idcapo missing
    await makeProperty(ids.propFamiliare, ids.orgA, { code: CODE, camere: 4, letti: 8 });
    await makeStayWithGuest(ids.propFamiliare, ids.orgA, {
      tipoAlloggiato: "FAMILIARE",
      leaderId: null,
      residenceCountryId: ids.itCountry,
      residenceComuneId: ids.comune,
      tourismType: "ALTRO",
      transportMeans: "AUTO",
    });
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.organization.delete({ where: { id: ids.orgA } }).catch(() => undefined);
    await prisma.organization.delete({ where: { id: ids.orgB } }).catch(() => undefined);
    await prisma.comune.delete({ where: { id: ids.comune } }).catch(() => undefined);
    await prisma.country.delete({ where: { id: ids.itCountry } }).catch(() => undefined);
    await prisma.country.delete({ where: { id: ids.frCountry } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("dati completi → OK con XML, codice e conteggi", async () => {
    const out = await loadRoss1000Report(prisma, {
      organizationId: ids.orgA,
      propertyId: ids.propComplete,
      period: PERIOD,
    });
    expect(out.kind).toBe("OK");
    if (out.kind === "OK") {
      expect(out.codice).toBe(CODE);
      expect(out.xml).toContain(`<codice>${CODE}</codice>`);
      expect(out.xml).toContain("<arrivo>");
      expect(out.arrivi).toBe(1);
      expect(out.partenze).toBe(1);
      expect(out.presenze).toBe(2); // notti 10 e 11
    }
  });

  it("capacità nulla → INCOMPLETE (camere/letti, mai 0 inventato)", async () => {
    const out = await loadRoss1000Report(prisma, {
      organizationId: ids.orgA,
      propertyId: ids.propNoCap,
      period: PERIOD,
    });
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      const f = out.missing.map((m) => m.field);
      expect(f).toContain("cameredisponibili");
      expect(f).toContain("lettidisponibili");
    }
  });

  it("codice struttura mancante → INCOMPLETE (codice)", async () => {
    const out = await loadRoss1000Report(prisma, {
      organizationId: ids.orgA,
      propertyId: ids.propNoCode,
      period: PERIOD,
    });
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing.some((m) => m.field === "codice")).toBe(true);
    }
  });

  it("residente estero → luogoresidenza mancante (mai inventato)", async () => {
    const out = await loadRoss1000Report(prisma, {
      organizationId: ids.orgA,
      propertyId: ids.propForeign,
      period: PERIOD,
    });
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing.some((m) => m.field === "luogoresidenza" && m.scope === "GUEST")).toBe(
        true,
      );
      // lo Stato di residenza estero invece è disponibile → NON deve risultare mancante
      expect(out.missing.some((m) => m.field === "statoresidenza")).toBe(false);
    }
  });

  it("FAMILIARE senza capogruppo → idcapo mancante", async () => {
    const out = await loadRoss1000Report(prisma, {
      organizationId: ids.orgA,
      propertyId: ids.propFamiliare,
      period: PERIOD,
    });
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing.some((m) => m.field === "idcapo")).toBe(true);
    }
  });

  it("[isolamento] un'altra org non accede alla property → INCOMPLETE struttura", async () => {
    const out = await loadRoss1000Report(prisma, {
      organizationId: ids.orgB,
      propertyId: ids.propComplete, // appartiene a orgA
      period: PERIOD,
    });
    // Fallirebbe se la query property perdesse il filtro organizationId (restituirebbe OK con i dati di orgA).
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing.some((m) => m.field === "struttura")).toBe(true);
    }
  });
});
