// Test UNIT (fake Prisma, no DB) della disciplina "mai inventare" del loader SPOT (Puglia).
// A2: gli OPEN STAY (departureDate === null) vengono esclusi PRIMA dell'aggregazione e
// segnalati in `missing` → esito INCOMPLETE. Mai presenze inventate per un soggiorno aperto.
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { loadSpotReport } from "../report";

const IT = "100000100";
const ARR = new Date("2026-05-10T00:00:00.000Z");
const DEP = new Date("2026-05-12T00:00:00.000Z");

type FakeGuest = Record<string, unknown>;

function guest(over: FakeGuest = {}): FakeGuest {
  return {
    id: "g1",
    sex: "M",
    birthDate: new Date("1990-05-20T00:00:00.000Z"),
    tipoAlloggiato: "OSPITE_SINGOLO",
    leaderId: null,
    citizenship: { code: IT },
    residenceCountry: { code: IT },
    residenceComune: { code: "419082053" },
    ...over,
  };
}

function fakePrisma(stays: unknown[]): PrismaClient {
  return {
    property: {
      findFirst: async () => ({ camereDisponibili: 2, lettiDisponibili: 4 }),
    },
    stay: { findMany: async () => stays },
  } as unknown as PrismaClient;
}

const input = { organizationId: "org1", propertyId: "p1", period: "2026-05" };

describe("loadSpotReport — disciplina mai-inventare (unit)", () => {
  it("dati completi (soggiorno chiuso) → OK", async () => {
    const prisma = fakePrisma([
      { id: "s1", arrivalDate: ARR, departureDate: DEP, guests: [guest()] },
    ]);
    const out = await loadSpotReport(prisma, input);
    expect(out.kind).toBe("OK");
  });

  it("[A2] open stay → INCOMPLETE, segnalato come departureDate/STRUTTURA", async () => {
    const prisma = fakePrisma([
      { id: "sOpen", arrivalDate: ARR, departureDate: null, guests: [guest({ id: "gO" })] },
    ]);
    const out = await loadSpotReport(prisma, input);
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      expect(out.missing).toContainEqual({
        field: "departureDate",
        scope: "STRUTTURA",
        refId: "sOpen",
      });
      expect(out.missing.some((m) => m.refId === "gO")).toBe(false);
    }
  });

  it("[A2] mix chiuso+aperto → INCOMPLETE; solo l'aperto è in missing", async () => {
    const prisma = fakePrisma([
      { id: "sClosed", arrivalDate: ARR, departureDate: DEP, guests: [guest({ id: "gC" })] },
      { id: "sOpen", arrivalDate: ARR, departureDate: null, guests: [guest({ id: "gO" })] },
    ]);
    const out = await loadSpotReport(prisma, input);
    expect(out.kind).toBe("INCOMPLETE");
    if (out.kind === "INCOMPLETE") {
      const dep = out.missing.filter((m) => m.field === "departureDate");
      expect(dep).toEqual([{ field: "departureDate", scope: "STRUTTURA", refId: "sOpen" }]);
    }
  });
});
