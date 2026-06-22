import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { loadSiciliaReport } from "../report";

const IT = "100000100";
const ARR = new Date("2026-05-10T10:00:00.000Z");
const DEP = new Date("2026-05-12T10:00:00.000Z");

type FakeGuest = Record<string, unknown>;

function guest(over: FakeGuest = {}): FakeGuest {
  return {
    id: "g1",
    sex: "M",
    birthDate: new Date("1990-05-20T00:00:00.000Z"),
    tipoAlloggiato: "OSPITE_SINGOLO",
    citizenship: { code: IT },
    birthCountry: { code: IT },
    birthComune: { code: "419087015" },
    residenceCountry: { code: IT },
    residenceComune: { code: "419082053" },
    ...over,
  };
}

function fakePrisma(stays: unknown[], opts: { propertyExists?: boolean } = {}): PrismaClient {
  return {
    property: {
      findFirst: async ({ where }: { where: { organizationId: string } }) =>
        (opts.propertyExists ?? true) && where.organizationId === "org1" ? { id: "p1" } : null,
    },
    stay: { findMany: async () => stays },
  } as unknown as PrismaClient;
}

const input = {
  organizationId: "org1",
  propertyId: "p1",
  period: "2026-05",
  hotelCode: "TRS-IT-SIC-00004",
};

describe("loadSiciliaReport", () => {
  it("dati completi → OK con mapping codici/gender/type/checkout", async () => {
    const prisma = fakePrisma([
      { id: "s1", arrivalDate: ARR, departureDate: DEP, guests: [guest()] },
    ]);
    const out = await loadSiciliaReport(prisma, input);
    expect(out.kind).toBe("OK");
    if (out.kind === "OK") {
      expect(out.guests).toBe(1);
      const g = out.stays[0].guests[0];
      expect(g.gender).toBe(1); // M → 1
      expect(g.type).toBe(16); // OSPITE_SINGOLO
      expect(g.nationalityCode).toBe(IT);
      expect(g.birthPlaceCode).toBe("419087015"); // nascita IT → comune
      expect(g.checkout).toBe(true); // ha data di partenza
      expect(g.arrivalDate).toBe("2026-05-10T10:00:00.000Z");
      expect(out.stays[0].hotelCode).toBe("TRS-IT-SIC-00004");
    }
  });

  it("nascita estera → birthPlaceCode = codice nazione", async () => {
    const prisma = fakePrisma([
      {
        id: "s1",
        arrivalDate: ARR,
        departureDate: DEP,
        guests: [guest({ birthCountry: { code: "100000215" }, birthComune: null })],
      },
    ]);
    const out = await loadSiciliaReport(prisma, input);
    expect(out.kind).toBe("OK");
    if (out.kind === "OK") expect(out.stays[0].guests[0].birthPlaceCode).toBe("100000215");
  });

  it("codice mancante (cittadinanza) → INCOMPLETE", async () => {
    const prisma = fakePrisma([
      { id: "s1", arrivalDate: ARR, departureDate: DEP, guests: [guest({ citizenship: null })] },
    ]);
    const out = await loadSiciliaReport(prisma, input);
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing.some((m) => m.field === "NationalityCode")).toBe(true);
    }
  });

  it("soggiorno senza data di partenza → INCOMPLETE (mai inventata)", async () => {
    const prisma = fakePrisma([
      { id: "s1", arrivalDate: ARR, departureDate: null, guests: [guest()] },
    ]);
    const out = await loadSiciliaReport(prisma, input);
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing.some((m) => m.field === "departureDate")).toBe(true);
    }
  });

  it("hotelCode mancante → INCOMPLETE", async () => {
    const prisma = fakePrisma([
      { id: "s1", arrivalDate: ARR, departureDate: DEP, guests: [guest()] },
    ]);
    const out = await loadSiciliaReport(prisma, { ...input, hotelCode: "" });
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing.some((m) => m.field === "hotelCode")).toBe(true);
    }
  });

  it("[isolamento] org diversa → INCOMPLETE struttura", async () => {
    const prisma = fakePrisma([], { propertyExists: true });
    const out = await loadSiciliaReport(prisma, { ...input, organizationId: "orgX" });
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing.some((m) => m.field === "struttura")).toBe(true);
    }
  });
});
