import { describe, expect, it } from "vitest";
import {
  parseValidationResponse,
  SiciliaPmsClient,
  SiciliaPmsError,
  type HttpRequest,
  type HttpResponse,
  type HttpTransport,
} from "../pms-client";
import type { SiciliaStay } from "../tracciato-xml";

/** Transport fake: registra le richieste e risponde con code/scriptato. Nessuna rete. */
function fakeTransport(responder: (req: HttpRequest) => HttpResponse): {
  transport: HttpTransport;
  requests: HttpRequest[];
} {
  const requests: HttpRequest[] = [];
  return {
    requests,
    transport: {
      send: async (req) => {
        requests.push(req);
        return responder(req);
      },
    },
  };
}

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
      checkout: false,
      bedOccupancy: true,
      rooms: [
        { roomId: "1", startDate: "2026-05-10T10:00:00.000Z", endDate: "2026-05-12T10:00:00.000Z" },
      ],
    },
  ],
});

describe("SiciliaPmsClient — login", () => {
  it("invia UserId/Password e ricava il token dall'header Authorization", async () => {
    const { transport, requests } = fakeTransport(() => ({
      status: 200,
      headers: { Authorization: "Bearer abc123" },
      body: "",
    }));
    const token = await new SiciliaPmsClient(transport).login({ userId: "u", password: "p" });
    expect(token).toBe("Bearer abc123");
    expect(requests[0].headers.UserId).toBe("u");
    expect(requests[0].headers.Password).toBe("p");
    expect(requests[0].url).toContain("/api/auth/login");
  });

  it("token dal body, ripulito dalle virgolette", async () => {
    const { transport } = fakeTransport(() => ({ status: 200, headers: {}, body: '"tok-xyz"' }));
    const token = await new SiciliaPmsClient(transport).login({ userId: "u", password: "p" });
    expect(token).toBe("tok-xyz");
  });

  it("HTTP non-200 → errore", async () => {
    const { transport } = fakeTransport(() => ({ status: 401, headers: {}, body: "" }));
    await expect(
      new SiciliaPmsClient(transport).login({ userId: "u", password: "p" }),
    ).rejects.toThrow(SiciliaPmsError);
  });
});

describe("SiciliaPmsClient — addStays / endDay", () => {
  it("POST addfrompms con Authorization e body XML; 200 senza errori → ok", async () => {
    const { transport, requests } = fakeTransport(() => ({
      status: 200,
      headers: {},
      body: "<ArrayOfValidationResultDTO><ValidationResultDTO><IsValid>true</IsValid></ValidationResultDTO></ArrayOfValidationResultDTO>",
    }));
    const res = await new SiciliaPmsClient(transport).addStays("Bearer t", [stay()]);
    expect(res.ok).toBe(true);
    expect(res.errors).toHaveLength(0);
    const req = requests[0];
    expect(req.method).toBe("POST");
    expect(req.url).toContain("/api/stay/addfrompms");
    expect(req.headers.Authorization).toBe("Bearer t");
    expect(req.headers["Content-Type"]).toBe("text/xml"); // come l'esempio POST del protocollo
    expect(req.body).toContain("<StaysPmsDTO>");
  });

  it("risposta con messaggio Error → ok=false e errore raccolto", async () => {
    const body =
      "<ArrayOfValidationResultDTO><ValidationResultDTO><IsValid>false</IsValid>" +
      "<Messages><ValidationMessageDTO><Level>Error</Level><Code>E1</Code>" +
      "<Message>Arrival Date does not match Room Start Date</Message><FieldName>ArrivalDate</FieldName>" +
      "</ValidationMessageDTO></Messages></ValidationResultDTO></ArrayOfValidationResultDTO>";
    const { transport } = fakeTransport(() => ({ status: 200, headers: {}, body }));
    const res = await new SiciliaPmsClient(transport).addStays("Bearer t", [stay()]);
    expect(res.ok).toBe(false);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0].message).toContain("Room Start Date");
    expect(res.errors[0].fieldName).toBe("ArrivalDate");
  });

  it("HTTP 400 → ok=false anche senza messaggi", async () => {
    const { transport } = fakeTransport(() => ({ status: 400, headers: {}, body: "" }));
    const res = await new SiciliaPmsClient(transport).addStays("Bearer t", [stay()]);
    expect(res.ok).toBe(false);
    expect(res.status).toBe(400);
  });

  it("endDay invia EndDayPmsDTO al path corretto", async () => {
    const { transport, requests } = fakeTransport(() => ({ status: 200, headers: {}, body: "" }));
    await new SiciliaPmsClient(transport).endDay("Bearer t", {
      hotelCode: "TRS-IT-SIC-00004",
      currentDate: "2026-05-31T10:00:00.000Z",
    });
    expect(requests[0].url).toContain("/api/entity/enddayfrompms");
    expect(requests[0].body).toContain("<EndDayPmsDTO>");
  });
});

describe("parseValidationResponse", () => {
  it("estrae messaggi annidati; body vuoto → []", () => {
    expect(parseValidationResponse("")).toEqual([]);
    const msgs = parseValidationResponse(
      "<root><ValidationMessageDTO><Level>Warning</Level><Message>m1</Message></ValidationMessageDTO>" +
        "<NestedValidation><ValidationMessageDTO><Level>Error</Level><Message>m2</Message></ValidationMessageDTO></NestedValidation></root>",
    );
    expect(msgs.map((m) => m.message).sort()).toEqual(["m1", "m2"]);
  });
});
