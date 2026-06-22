import type { PrismaClient } from "@prisma/client";
import type { ExistingImportedStay } from "../domain/reconcile";
import type {
  ApplySyncInput,
  CreateReservationImportInput,
  ImportedStayView,
  ReservationImportRepository,
  ReservationImportView,
} from "../ports";

/** Guest count placeholder per un soggiorno importato: l'host completerà gli ospiti. */
const IMPORTED_GUESTS_PLACEHOLDER = 1;

export class PrismaReservationImportRepository implements ReservationImportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateReservationImportInput): Promise<{ id: string }> {
    return this.prisma.reservationImport.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        url: input.url,
        source: input.source,
      },
      select: { id: true },
    });
  }

  async remove(importId: string, organizationId: string): Promise<void> {
    // deleteMany con organizationId nel where = isolamento: un id di un'altra org non cancella nulla.
    await this.prisma.reservationImport.deleteMany({ where: { id: importId, organizationId } });
  }

  async listByProperty(
    propertyId: string,
    organizationId: string,
  ): Promise<ReservationImportView[]> {
    const rows = await this.prisma.reservationImport.findMany({
      where: { propertyId, organizationId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => ({
      id: r.id,
      propertyId: r.propertyId,
      url: r.url,
      source: r.source,
      lastSyncAt: r.lastSyncAt,
      lastError: r.lastError,
      lastImported: r.lastImported,
    }));
  }

  async getById(importId: string, organizationId: string): Promise<ReservationImportView | null> {
    const r = await this.prisma.reservationImport.findFirst({
      where: { id: importId, organizationId },
    });
    if (!r) return null;
    return {
      id: r.id,
      propertyId: r.propertyId,
      url: r.url,
      source: r.source,
      lastSyncAt: r.lastSyncAt,
      lastError: r.lastError,
      lastImported: r.lastImported,
    };
  }

  async listAll(): Promise<{ id: string; organizationId: string }[]> {
    return this.prisma.reservationImport.findMany({ select: { id: true, organizationId: true } });
  }

  async listImportedStays(importId: string): Promise<ExistingImportedStay[]> {
    const stays = await this.prisma.stay.findMany({
      where: { reservationImportId: importId, icalUid: { not: null } },
      select: {
        id: true,
        icalUid: true,
        importStatus: true,
        arrivalDate: true,
        departureDate: true,
        _count: { select: { guests: true } },
      },
    });
    return stays.map((s) => ({
      id: s.id,
      icalUid: s.icalUid as string,
      importStatus: s.importStatus ?? "DRAFT",
      hasGuests: s._count.guests > 0,
      arrivalDate: s.arrivalDate,
      departureDate: s.departureDate,
    }));
  }

  async listImportedStaysForProperty(
    propertyId: string,
    organizationId: string,
  ): Promise<ImportedStayView[]> {
    const stays = await this.prisma.stay.findMany({
      where: { propertyId, organizationId, reservationImportId: { not: null } },
      orderBy: { arrivalDate: "asc" },
      select: {
        id: true,
        icalUid: true,
        importStatus: true,
        importSource: true,
        arrivalDate: true,
        departureDate: true,
        guestsCount: true,
        _count: { select: { guests: true } },
      },
    });
    return stays.map((s) => ({
      id: s.id,
      icalUid: s.icalUid,
      importStatus: s.importStatus,
      importSource: s.importSource,
      arrivalDate: s.arrivalDate,
      departureDate: s.departureDate,
      guestsCount: s.guestsCount,
      guestsAdded: s._count.guests,
    }));
  }

  async applySync(input: ApplySyncInput): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      for (const c of input.toCreate) {
        await tx.stay.create({
          data: {
            organizationId: input.organizationId,
            propertyId: input.propertyId,
            reservationImportId: input.importId,
            icalUid: c.icalUid,
            importSource: input.source,
            importStatus: "DRAFT",
            arrivalDate: c.arrivalDate,
            departureDate: c.departureDate,
            guestsCount: IMPORTED_GUESTS_PLACEHOLDER,
            isShortStay: false,
          },
        });
      }
      for (const u of input.toUpdate) {
        await tx.stay.update({
          where: { id: u.stayId },
          data: {
            arrivalDate: u.arrivalDate,
            departureDate: u.departureDate,
            importStatus: u.importStatus,
          },
        });
      }
      for (const cancel of input.toCancel) {
        await tx.stay.update({
          where: { id: cancel.stayId },
          data: { importStatus: cancel.importStatus },
        });
      }
      await tx.reservationImport.update({
        where: { id: input.importId },
        data: { lastSyncAt: new Date(), lastError: null, lastImported: input.seen },
      });
    });
  }

  async recordSyncError(importId: string, message: string): Promise<void> {
    await this.prisma.reservationImport.update({
      where: { id: importId },
      data: { lastSyncAt: new Date(), lastError: message },
    });
  }
}
