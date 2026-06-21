// Serializzazione dei body XML del "Protocollo di Comunicazione PMS" — Osservatorio Turistico Sicilia.
// PURA: input tipizzato → stringa XML. È una WebAPI REST (non un file da caricare): questi sono i body
// di POST /api/stay/addfrompms e POST /api/entity/enddayfrompms. Il CLIENT HTTP e l'invio reale NON
// stanno qui e restano gated (credenziali UTENTE PMS + decisione umana — guardrail #1: niente Send reale).
//
// Fonte: "Protocollo di Comunicazione PMS" Rev. 1.0.7 (Regione Siciliana). Case-sensitive.
// Codici: tabelle AlloggiatiWeb/Polizia, 9 cifre (NationalityCode/BirthPlaceCode/ResidencePlaceCode).
// Ordine elementi: come da XSD (Stay = HotelCode, StayId, Guests), non come negli esempi prosa.
//
// ASSUNZIONE (da confermare con l'ente prima del primo invio): Gender numerico 1/2 (1=M, 2=F);
// il PDF è incoerente tra prosa/XSD ma gli esempi usano valori numerici.

export class SiciliaXmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiciliaXmlError";
  }
}

export interface SiciliaRoom {
  roomId: string;
  startDate: string; // UTC dateTime "YYYY-MM-DDThh:mm:ss.sssZ"
  endDate: string;
}

export interface SiciliaGuest {
  guestId: string;
  age: number; // 0..150
  nationalityCode: string; // [0-9]{9}
  birthPlaceCode: string; // [0-9]{9} (comune IT o nazione estera)
  residencePlaceCode: string; // [0-9]{9}
  type: number; // 16..20
  gender: 1 | 2;
  email?: string;
  arrivalDate: string; // UTC dateTime
  departureDate: string;
  checkout: boolean;
  bedOccupancy: boolean;
  rooms: SiciliaRoom[];
}

export interface SiciliaStay {
  hotelCode: string; // es. "TRS-IT-SIC-00004"
  stayId: string;
  guests: SiciliaGuest[];
}

export interface SiciliaEndDay {
  hotelCode: string;
  currentDate: string; // UTC dateTime
}

// ----------------------------- helper -----------------------------

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const UTC_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CODE9 = /^[0-9]{9}$/;

function requireNonEmpty(value: string | undefined, name: string): string {
  if (!value || value.trim() === "")
    throw new SiciliaXmlError(`Campo "${name}" obbligatorio mancante.`);
  return value;
}

function requireCode9(value: string, name: string): string {
  if (!CODE9.test(value)) {
    throw new SiciliaXmlError(
      `Campo "${name}" non valido: "${value}" (atteso 9 cifre AlloggiatiWeb).`,
    );
  }
  return value;
}

function requireUtc(value: string, name: string): string {
  if (!UTC_DATETIME.test(value)) {
    throw new SiciliaXmlError(
      `Campo "${name}" non valido: "${value}" (atteso dateTime UTC "YYYY-MM-DDThh:mm:ss.sssZ").`,
    );
  }
  return value;
}

function requireRange(value: number, min: number, max: number, name: string): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new SiciliaXmlError(
      `Campo "${name}" non valido: ${value} (atteso intero ${min}-${max}).`,
    );
  }
  return value;
}

function tag(name: string, value: string): string {
  return `<${name}>${escapeXml(value)}</${name}>`;
}

// ----------------------------- costruzione -----------------------------

function buildRoom(r: SiciliaRoom): string {
  return (
    "<Room>" +
    tag("RoomId", requireNonEmpty(r.roomId, "RoomId")) +
    tag("StartDate", requireUtc(r.startDate, "Room.StartDate")) +
    tag("EndDate", requireUtc(r.endDate, "Room.EndDate")) +
    "</Room>"
  );
}

function buildGuest(g: SiciliaGuest): string {
  if (g.rooms.length === 0) {
    throw new SiciliaXmlError(`Guest "${g.guestId}": almeno una Room è obbligatoria.`);
  }
  // Vincolo di validazione del portale: con una sola camera, ArrivalDate == Room.StartDate.
  if (g.rooms.length === 1 && g.rooms[0].startDate !== g.arrivalDate) {
    throw new SiciliaXmlError(
      `Guest "${g.guestId}": con una sola camera, ArrivalDate deve coincidere con Room.StartDate.`,
    );
  }
  if (g.gender !== 1 && g.gender !== 2) {
    throw new SiciliaXmlError(`Guest "${g.guestId}": Gender non valido (atteso 1 o 2).`);
  }

  const email = g.email && g.email.trim() !== "" ? tag("EMail", g.email) : "";

  return (
    "<Guest>" +
    tag("GuestId", requireNonEmpty(g.guestId, "GuestId")) +
    tag("Age", String(requireRange(g.age, 0, 150, "Age"))) +
    tag("NationalityCode", requireCode9(g.nationalityCode, "NationalityCode")) +
    tag("BirthPlaceCode", requireCode9(g.birthPlaceCode, "BirthPlaceCode")) +
    tag("ResidencePlaceCode", requireCode9(g.residencePlaceCode, "ResidencePlaceCode")) +
    tag("Type", String(requireRange(g.type, 16, 20, "Type"))) +
    tag("Gender", String(g.gender)) +
    email +
    tag("ArrivalDate", requireUtc(g.arrivalDate, "ArrivalDate")) +
    tag("DepartureDate", requireUtc(g.departureDate, "DepartureDate")) +
    tag("Checkout", g.checkout ? "true" : "false") +
    tag("BedOccupancy", g.bedOccupancy ? "true" : "false") +
    "<Rooms>" +
    g.rooms.map(buildRoom).join("") +
    "</Rooms>" +
    "</Guest>"
  );
}

function buildStay(s: SiciliaStay): string {
  if (s.guests.length === 0) {
    throw new SiciliaXmlError(`Stay "${s.stayId}": almeno un Guest è obbligatorio.`);
  }
  return (
    "<Stay>" +
    tag("HotelCode", requireNonEmpty(s.hotelCode, "HotelCode")) +
    tag("StayId", requireNonEmpty(s.stayId, "StayId")) +
    "<Guests>" +
    s.guests.map(buildGuest).join("") +
    "</Guests>" +
    "</Stay>"
  );
}

/** Body di POST /api/stay/addfrompms: radice <StaysPmsDTO> con uno o più <Stay>. */
export function buildStaysPmsXml(stays: readonly SiciliaStay[]): string {
  if (stays.length === 0) throw new SiciliaXmlError("Nessun soggiorno da serializzare.");
  return (
    '<?xml version="1.0" encoding="utf-8" ?>' +
    "<StaysPmsDTO>" +
    stays.map(buildStay).join("") +
    "</StaysPmsDTO>"
  );
}

/** Body di POST /api/entity/enddayfrompms: radice <EndDayPmsDTO>. Da inviare anche senza movimenti. */
export function buildEndDayPmsXml(e: SiciliaEndDay): string {
  return (
    '<?xml version="1.0" encoding="utf-8" ?>' +
    "<EndDayPmsDTO>" +
    tag("HotelCode", requireNonEmpty(e.hotelCode, "HotelCode")) +
    tag("CurrentDate", requireUtc(e.currentDate, "CurrentDate")) +
    "</EndDayPmsDTO>"
  );
}
