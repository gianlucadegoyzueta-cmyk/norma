// Carica i dati dell'organizzazione e li impacchetta nell'export "I tuoi dati" (zip di CSV).
// Isolato per organizationId (multi-tenant). Riusa i builder CSV puri + l'encoder zip.

import type { PrismaClient, ReservationSource } from "@prisma/client";
import {
  guestsCsv,
  istatCsv,
  staysCsv,
  taxCsv,
  type GuestExportRow,
  type IstatExportRow,
  type StayExportRow,
  type TaxExportRow,
} from "./domain/csv";
import { buildZip, type ZipEntry } from "./domain/zip";

const SOURCE_LABEL: Record<ReservationSource, string> = {
  AIRBNB: "Airbnb",
  BOOKING: "Booking",
  VRBO: "Vrbo",
  OTHER: "Calendario esterno",
};

/** Riga snapshot ISTAT come salvata in IstatSubmission.rows (vedi istat/domain/aggregate). */
interface IstatRowSnapshot {
  label?: string;
  arrivi?: number;
  presenze?: number;
}

export interface DataExport {
  filename: string;
  /** Byte dell'archivio zip. */
  bytes: Uint8Array;
}

/**
 * Costruisce l'export completo dei dati dell'organizzazione: soggiorni, ospiti (campi non
 * sensibili), tasse di soggiorno e invii ISTAT. Un CSV per dataset, racchiusi in un unico zip.
 */
export async function buildDataExport(
  prisma: PrismaClient,
  organizationId: string,
): Promise<DataExport> {
  const [stays, guests, declarations, istatSubmissions] = await Promise.all([
    prisma.stay.findMany({
      where: { organizationId },
      orderBy: { arrivalDate: "desc" },
      select: {
        id: true,
        arrivalDate: true,
        departureDate: true,
        guestsCount: true,
        importSource: true,
        property: { select: { name: true, comune: { select: { name: true, provincia: true } } } },
        _count: { select: { guests: true } },
      },
    }),
    prisma.guest.findMany({
      where: { organizationId },
      orderBy: [{ stayId: "asc" }, { lastName: "asc" }],
      select: {
        stayId: true,
        lastName: true,
        firstName: true,
        sex: true,
        birthDate: true,
        tipoAlloggiato: true,
        birthCountry: { select: { name: true } },
        citizenship: { select: { name: true } },
        schedina: { select: { status: true } },
      },
    }),
    prisma.touristTaxDeclaration.findMany({
      where: { organizationId },
      orderBy: { period: "desc" },
      select: {
        period: true,
        status: true,
        comune: { select: { name: true } },
        lines: {
          select: { propertyName: true, stayId: true, taxedNights: true, amountCents: true },
        },
      },
    }),
    prisma.istatSubmission.findMany({
      where: { organizationId },
      orderBy: { period: "desc" },
      select: { period: true, rows: true },
    }),
  ]);

  const stayRows: StayExportRow[] = stays.map((s) => ({
    id: s.id,
    propertyName: s.property.name,
    comuneName: s.property.comune.name,
    provincia: s.property.comune.provincia,
    arrivalDate: s.arrivalDate,
    departureDate: s.departureDate,
    guestsCount: s.guestsCount,
    guestsAdded: s._count.guests,
    origin: s.importSource ? SOURCE_LABEL[s.importSource] : "Manuale",
  }));

  const guestRows: GuestExportRow[] = guests.map((g) => ({
    stayId: g.stayId,
    lastName: g.lastName,
    firstName: g.firstName,
    sex: g.sex,
    birthDate: g.birthDate,
    birthCountry: g.birthCountry.name,
    citizenship: g.citizenship.name,
    tipoAlloggiato: g.tipoAlloggiato,
    schedinaStatus: g.schedina?.status ?? "—",
  }));

  const taxRows: TaxExportRow[] = declarations.flatMap((d) =>
    d.lines.map((l) => ({
      comuneName: d.comune.name,
      period: d.period,
      status: d.status,
      propertyName: l.propertyName,
      stayId: l.stayId,
      taxedNights: l.taxedNights,
      amountCents: l.amountCents,
    })),
  );

  const istatRows: IstatExportRow[] = istatSubmissions.flatMap((sub) => {
    const rows = Array.isArray(sub.rows) ? (sub.rows as IstatRowSnapshot[]) : [];
    return rows.map((r) => ({
      period: sub.period,
      provenance: r.label ?? "",
      arrivi: r.arrivi ?? 0,
      presenze: r.presenze ?? 0,
    }));
  });

  const enc = new TextEncoder();
  const entries: ZipEntry[] = [
    { name: "soggiorni.csv", data: enc.encode(staysCsv(stayRows)) },
    { name: "ospiti.csv", data: enc.encode(guestsCsv(guestRows)) },
    { name: "tasse-di-soggiorno.csv", data: enc.encode(taxCsv(taxRows)) },
    { name: "istat.csv", data: enc.encode(istatCsv(istatRows)) },
  ];

  return { filename: "norma-i-tuoi-dati.zip", bytes: buildZip(entries) };
}
