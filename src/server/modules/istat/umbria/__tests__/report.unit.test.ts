// Test UNIT (fake Prisma, no DB) della disciplina "mai inventare" del loader Umbria (Turismatica C59).
//  - A2: gli OPEN STAY (departureDate === null) sono esclusi PRIMA dell'aggregazione → INCOMPLETE.
//  - A3: una provenienza NON mappata (comune senza provincia, paese estero fuori tabella) NON
//    costruisce un guest con codici vuoti: viene segnalata e saltata → INCOMPLETE.
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { loadUmbriaReport } from "../report";

const IT = "100000100";
const ARR = new Date("2026-05-10T00:00:00.000Z");
const DEP = new Date("2026-05-12T00:00:00.000Z");

type FakeGuest = Record<string, unknown>;

/** Guest residente in Italia con provincia mappabile (PG → Perugia). */
function guestIt(over: FakeGuest = {}): FakeGuest {
  return {
    id: "g1",
    residenceCountry: { code: IT, name: "ITALIA" },
    residenceComune: { provincia: "PG" },
    ...over,
  };
}

function fakePrisma(stays: unknown[]): PrismaClient {
  return {
    property: {
      findFirst: async () => ({ name: "Casa Test", camereDisponibili: 2 }),
    },
    stay: { findMany: async () => stays },
  } as unknown as PrismaClient;
}

const input = { organizationId: "org1", propertyId: "p1", period: "2026-05" };

describe("loadUmbriaReport — disciplina mai-inventare (unit)", () => {
  it("dati completi (chiuso, provenienza mappata) → OK", async () => {
    const prisma = fakePrisma([
      { id: "s1", arrivalDate: ARR, departureDate: DEP, guests: [guestIt()] },
    ]);
    const out = await loadUmbriaReport(prisma, input);
    expect(out.kind).toBe("OK");
  });

  it("[A2] open stay → INCOMPLETE (departureDate/STRUTTURA), escluso prima dell'aggregazione", async () => {
    const prisma = fakePrisma([
      { id: "sOpen", arrivalDate: ARR, departureDate: null, guests: [guestIt({ id: "gO" })] },
    ]);
    const out = await loadUmbriaReport(prisma, input);
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing).toContainEqual({
        field: "departureDate",
        scope: "STRUTTURA",
        refId: "sOpen",
      });
      expect(out.missing.some((m) => m.field === "provenienza")).toBe(false);
    }
  });

  it("[A3] provenienza ITALIA senza provincia → INCOMPLETE, nessun guest a codici vuoti", async () => {
    const prisma = fakePrisma([
      {
        id: "s1",
        arrivalDate: ARR,
        departureDate: DEP,
        guests: [guestIt({ id: "gNoProv", residenceComune: { provincia: null } })],
      },
    ]);
    const out = await loadUmbriaReport(prisma, input);
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing).toContainEqual({
        field: "provenienza",
        scope: "GUEST",
        refId: "gNoProv",
      });
    }
  });

  it("[A3] provenienza ESTERA fuori tabella → INCOMPLETE (mai un codice arbitrario)", async () => {
    const prisma = fakePrisma([
      {
        id: "s1",
        arrivalDate: ARR,
        departureDate: DEP,
        guests: [
          guestIt({
            id: "gEstero",
            residenceCountry: { code: "999999999", name: "REPUBBLICA INVENTATA" },
            residenceComune: null,
          }),
        ],
      },
    ]);
    const out = await loadUmbriaReport(prisma, input);
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing).toContainEqual({
        field: "provenienza",
        scope: "GUEST",
        refId: "gEstero",
      });
    }
  });
});
