import { describe, expect, it } from "vitest";
import { evaluateTransmitGate, transmitSicilia, type SiciliaTransmitClient } from "../transmit";
import type { SiciliaStay } from "../tracciato-xml";

const creds = { userId: "u", password: "p" };
const openGate = { enabledFlag: "true", perPropertyEnabled: true, confirmRealSend: true };

const stay = (): SiciliaStay => ({
  hotelCode: "TRS-IT-SIC-00004",
  stayId: "S1",
  guests: [
    {
      guestId: "G1",
      age: 30,
      nationalityCode: "100000100",
      birthPlaceCode: "419087015",
      residencePlaceCode: "419082053",
      type: 16,
      gender: 1,
      arrivalDate: "2026-05-10T10:00:00.000Z",
      departureDate: "2026-05-12T10:00:00.000Z",
      checkout: true,
      bedOccupancy: true,
      rooms: [
        { roomId: "1", startDate: "2026-05-10T10:00:00.000Z", endDate: "2026-05-12T10:00:00.000Z" },
      ],
    },
  ],
});

function fakeClient(over: Partial<SiciliaTransmitClient> = {}): {
  client: SiciliaTransmitClient;
  calls: string[];
} {
  const calls: string[] = [];
  const ok = { ok: true, status: 200, errors: [], raw: "" };
  return {
    calls,
    client: {
      login: async () => {
        calls.push("login");
        return "tok";
      },
      addStays: async () => {
        calls.push("addStays");
        return ok;
      },
      endDay: async () => {
        calls.push("endDay");
        return ok;
      },
      logout: async () => {
        calls.push("logout");
      },
      ...over,
    },
  };
}

describe("evaluateTransmitGate — tripla barriera", () => {
  it("aperto solo con tutti e tre i cancelli", () => {
    expect(evaluateTransmitGate(openGate).ok).toBe(true);
    expect(evaluateTransmitGate({ ...openGate, enabledFlag: "false" }).ok).toBe(false);
    expect(evaluateTransmitGate({ ...openGate, perPropertyEnabled: false }).ok).toBe(false);
    expect(evaluateTransmitGate({ ...openGate, confirmRealSend: false }).ok).toBe(false);
  });
});

describe("transmitSicilia", () => {
  it("gate chiuso → niente invio, nessuna chiamata al client", async () => {
    const { client, calls } = fakeClient();
    const res = await transmitSicilia(client, creds, {
      stays: [stay()],
      gate: { ...openGate, confirmRealSend: false },
    });
    expect(res.sent).toBe(false);
    expect(calls).toEqual([]);
  });

  it("gate aperto → sequenza login→addStays→endDay→logout", async () => {
    const { client, calls } = fakeClient();
    const res = await transmitSicilia(client, creds, {
      stays: [stay()],
      endDay: { hotelCode: "TRS-IT-SIC-00004", currentDate: "2026-05-31T10:00:00.000Z" },
      gate: openGate,
    });
    expect(res.sent).toBe(true);
    expect(calls).toEqual(["login", "addStays", "endDay", "logout"]);
  });

  it("nessun soggiorno → niente invio anche a gate aperto", async () => {
    const { client, calls } = fakeClient();
    const res = await transmitSicilia(client, creds, { stays: [], gate: openGate });
    expect(res.sent).toBe(false);
    expect(calls).toEqual([]);
  });

  it("logout che fallisce non invalida l'invio", async () => {
    const { client } = fakeClient({
      logout: async () => {
        throw new Error("network");
      },
    });
    const res = await transmitSicilia(client, creds, { stays: [stay()], gate: openGate });
    expect(res.sent).toBe(true);
    expect(res.add?.ok).toBe(true);
  });
});
