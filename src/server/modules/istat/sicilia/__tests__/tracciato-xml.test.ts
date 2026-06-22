import { describe, expect, it } from "vitest";
import {
  buildEndDayPmsXml,
  buildStaysPmsXml,
  SiciliaXmlError,
  type SiciliaGuest,
  type SiciliaStay,
} from "../tracciato-xml";

// Allineato all'esempio ufficiale del protocollo (pag. 14), con ordine elementi da XSD.
function guest(over: Partial<SiciliaGuest> = {}): SiciliaGuest {
  return {
    guestId: "F4AD8F3AD7DF6F15EDB5E8F4BE83D4EB58051256",
    age: 25,
    nationalityCode: "100000100",
    birthPlaceCode: "419087015",
    residencePlaceCode: "419082053",
    type: 16,
    gender: 1,
    email: "mario.r@mail.it",
    arrivalDate: "2014-07-05T10:00:00.000Z",
    departureDate: "2014-07-11T10:00:00.000Z",
    checkout: false,
    bedOccupancy: true,
    rooms: [
      { roomId: "13", startDate: "2014-07-05T10:00:00.000Z", endDate: "2014-07-11T10:00:00.000Z" },
    ],
    ...over,
  };
}

function stay(over: Partial<SiciliaStay> = {}): SiciliaStay {
  return {
    hotelCode: "TRS-IT-SIC-00004",
    stayId: "TRS-IT-SIC-00004_2014_0714172522",
    guests: [guest()],
    ...over,
  };
}

describe("buildStaysPmsXml — addfrompms", () => {
  it("radice e ordine elementi da XSD (HotelCode prima di StayId)", () => {
    const xml = buildStaysPmsXml([stay()]);
    expect(xml).toContain('<?xml version="1.0" encoding="utf-8" ?>');
    expect(xml).toContain(
      "<Stay><HotelCode>TRS-IT-SIC-00004</HotelCode><StayId>TRS-IT-SIC-00004_2014_0714172522</StayId><Guests>",
    );
  });

  it("guest con ordine campi e Rooms annidate", () => {
    const xml = buildStaysPmsXml([stay()]);
    expect(xml).toContain(
      "<Guest>" +
        "<GuestId>F4AD8F3AD7DF6F15EDB5E8F4BE83D4EB58051256</GuestId>" +
        "<Age>25</Age>" +
        "<NationalityCode>100000100</NationalityCode>" +
        "<BirthPlaceCode>419087015</BirthPlaceCode>" +
        "<ResidencePlaceCode>419082053</ResidencePlaceCode>" +
        "<Type>16</Type>" +
        "<Gender>1</Gender>" +
        "<EMail>mario.r@mail.it</EMail>" +
        "<ArrivalDate>2014-07-05T10:00:00.000Z</ArrivalDate>" +
        "<DepartureDate>2014-07-11T10:00:00.000Z</DepartureDate>" +
        "<Checkout>false</Checkout>" +
        "<BedOccupancy>true</BedOccupancy>" +
        "<Rooms><Room><RoomId>13</RoomId><StartDate>2014-07-05T10:00:00.000Z</StartDate><EndDate>2014-07-11T10:00:00.000Z</EndDate></Room></Rooms>" +
        "</Guest>",
    );
  });

  it("EMail opzionale: omessa se assente", () => {
    const xml = buildStaysPmsXml([stay({ guests: [guest({ email: undefined })] })]);
    expect(xml).not.toContain("<EMail>");
  });

  it("EMail malformata → omessa (evita rigetto 400 dell'intero Stay)", () => {
    const xml = buildStaysPmsXml([stay({ guests: [guest({ email: "non-una-email" })] })]);
    expect(xml).not.toContain("<EMail>");
  });

  it("codici non a 9 cifre → errore", () => {
    expect(() => buildStaysPmsXml([stay({ guests: [guest({ nationalityCode: "123" })] })])).toThrow(
      /NationalityCode/,
    );
  });

  it("Type fuori 16-20 e Age fuori 0-150 e Gender ≠1/2 → errore", () => {
    expect(() => buildStaysPmsXml([stay({ guests: [guest({ type: 21 })] })])).toThrow(/Type/);
    expect(() => buildStaysPmsXml([stay({ guests: [guest({ age: 200 })] })])).toThrow(/Age/);
    // @ts-expect-error gender fuori dominio
    expect(() => buildStaysPmsXml([stay({ guests: [guest({ gender: 3 })] })])).toThrow(/Gender/);
  });

  it("date non UTC → errore", () => {
    expect(() =>
      buildStaysPmsXml([stay({ guests: [guest({ arrivalDate: "2014-07-05" })] })]),
    ).toThrow(/ArrivalDate/);
  });

  it("una sola camera: ArrivalDate deve coincidere con Room.StartDate", () => {
    expect(() =>
      buildStaysPmsXml([
        stay({
          guests: [
            guest({
              arrivalDate: "2014-07-06T10:00:00.000Z", // ≠ room start
            }),
          ],
        }),
      ]),
    ).toThrow(/coincidere con Room.StartDate/);
  });

  it("nessuno stay → errore", () => {
    expect(() => buildStaysPmsXml([])).toThrow(SiciliaXmlError);
  });

  it("[A1] DepartureDate == ArrivalDate (notte-zero) → errore", () => {
    const sameDay = "2014-07-05T10:00:00.000Z";
    expect(() =>
      buildStaysPmsXml([
        stay({
          guests: [
            guest({
              arrivalDate: sameDay,
              departureDate: sameDay,
              rooms: [{ roomId: "13", startDate: sameDay, endDate: sameDay }],
            }),
          ],
        }),
      ]),
    ).toThrow(/successiva ad ArrivalDate/);
  });

  it("[A1] DepartureDate < ArrivalDate (intervallo invertito) → errore", () => {
    const arr = "2014-07-11T10:00:00.000Z";
    expect(() =>
      buildStaysPmsXml([
        stay({
          guests: [
            guest({
              arrivalDate: arr,
              departureDate: "2014-07-05T10:00:00.000Z", // prima dell'arrivo
              rooms: [{ roomId: "13", startDate: arr, endDate: "2014-07-12T10:00:00.000Z" }],
            }),
          ],
        }),
      ]),
    ).toThrow(/successiva ad ArrivalDate/);
  });

  it("[A1] Room con EndDate <= StartDate → errore (guest-dates valide)", () => {
    const arr = "2014-07-05T10:00:00.000Z";
    expect(() =>
      buildStaysPmsXml([
        stay({
          guests: [
            guest({
              arrivalDate: arr,
              departureDate: "2014-07-11T10:00:00.000Z", // soggiorno valido a livello guest
              rooms: [{ roomId: "13", startDate: arr, endDate: arr }], // room degenere
            }),
          ],
        }),
      ]),
    ).toThrow(/EndDate.*non successiva a StartDate/);
  });
});

describe("buildEndDayPmsXml — enddayfrompms", () => {
  it("radice EndDayPmsDTO con HotelCode e CurrentDate", () => {
    const xml = buildEndDayPmsXml({
      hotelCode: "TRS-IT-SIC-00004",
      currentDate: "2014-07-25T10:00:00.000Z",
    });
    expect(xml).toBe(
      '<?xml version="1.0" encoding="utf-8" ?>' +
        "<EndDayPmsDTO>" +
        "<HotelCode>TRS-IT-SIC-00004</HotelCode>" +
        "<CurrentDate>2014-07-25T10:00:00.000Z</CurrentDate>" +
        "</EndDayPmsDTO>",
    );
  });

  it("CurrentDate non UTC → errore", () => {
    expect(() => buildEndDayPmsXml({ hotelCode: "X", currentDate: "2014-07-25" })).toThrow(
      /CurrentDate/,
    );
  });
});
