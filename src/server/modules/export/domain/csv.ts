// Builder CSV per l'export "I tuoi dati". PURO (dati in → stringa out). Stessa convenzione degli
// export esistenti: separatore ";" (IT/Excel), righe CRLF, campi quotati se contengono ; " o a-capo.
// Esclude i dati sensibili (numeri documento, credenziali): è l'host che scarica i propri dati.

const dateFmt = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Rome",
});

function fmtDate(d: Date | null): string {
  return d ? dateFmt.format(d) : "";
}

function euro(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Quota un campo CSV se contiene separatore, virgolette o a-capo. */
function field(value: string): string {
  if (/[";\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Serializza una tabella (intestazione + righe) in CSV deterministico. */
export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers, ...rows].map((cells) => cells.map(field).join(";"));
  return lines.join("\r\n");
}

export interface StayExportRow {
  id: string;
  propertyName: string;
  comuneName: string;
  provincia: string;
  arrivalDate: Date;
  departureDate: Date | null;
  guestsCount: number;
  guestsAdded: number;
  origin: string; // es. "Airbnb", "Manuale"
}

export function staysCsv(rows: StayExportRow[]): string {
  return toCsv(
    [
      "ID soggiorno",
      "Struttura",
      "Comune",
      "Provincia",
      "Arrivo",
      "Partenza",
      "Ospiti dichiarati",
      "Ospiti inseriti",
      "Origine",
    ],
    rows.map((r) => [
      r.id,
      r.propertyName,
      r.comuneName,
      r.provincia,
      fmtDate(r.arrivalDate),
      fmtDate(r.departureDate),
      String(r.guestsCount),
      String(r.guestsAdded),
      r.origin,
    ]),
  );
}

export interface GuestExportRow {
  stayId: string;
  lastName: string;
  firstName: string;
  sex: string;
  birthDate: Date;
  birthCountry: string;
  citizenship: string;
  tipoAlloggiato: string;
  schedinaStatus: string;
}

export function guestsCsv(rows: GuestExportRow[]): string {
  // Campi anagrafici NON sensibili (niente numero/tipo documento): export del proprio dato host.
  return toCsv(
    [
      "ID soggiorno",
      "Cognome",
      "Nome",
      "Sesso",
      "Data di nascita",
      "Stato di nascita",
      "Cittadinanza",
      "Tipo alloggiato",
      "Stato schedina",
    ],
    rows.map((r) => [
      r.stayId,
      r.lastName,
      r.firstName,
      r.sex,
      fmtDate(r.birthDate),
      r.birthCountry,
      r.citizenship,
      r.tipoAlloggiato,
      r.schedinaStatus,
    ]),
  );
}

export interface TaxExportRow {
  comuneName: string;
  period: string;
  status: string;
  propertyName: string;
  stayId: string;
  taxedNights: number;
  amountCents: number;
}

export function taxCsv(rows: TaxExportRow[]): string {
  return toCsv(
    ["Comune", "Periodo", "Stato", "Struttura", "ID soggiorno", "Notti tassate", "Imposta (€)"],
    rows.map((r) => [
      r.comuneName,
      r.period,
      r.status,
      r.propertyName,
      r.stayId,
      String(r.taxedNights),
      euro(r.amountCents),
    ]),
  );
}

export interface IstatExportRow {
  period: string;
  provenance: string;
  arrivi: number;
  presenze: number;
}

export function istatCsv(rows: IstatExportRow[]): string {
  return toCsv(
    ["Periodo", "Provenienza", "Arrivi", "Presenze"],
    rows.map((r) => [r.period, r.provenance, String(r.arrivi), String(r.presenze)]),
  );
}
