import type { ReservationSource, StayImportStatus } from "@prisma/client";
import type { ExistingImportedStay } from "../domain/reconcile";
import type {
  ApplySyncInput,
  CreateReservationImportInput,
  ImportedStayView,
  ReservationImportRepository,
  ReservationImportView,
} from "../ports";

interface ImportRow {
  id: string;
  organizationId: string;
  propertyId: string;
  url: string;
  source: ReservationSource;
  lastSyncAt: Date | null;
  lastError: string | null;
  lastImported: number;
}

interface StayRow {
  id: string;
  organizationId: string;
  propertyId: string;
  reservationImportId: string;
  icalUid: string;
  importSource: ReservationSource;
  importStatus: StayImportStatus;
  arrivalDate: Date;
  departureDate: Date | null;
  guestsCount: number;
  guestsAdded: number;
}

/** Repository import prenotazioni IN MEMORIA per i test (niente DB). */
export class InMemoryReservationImportRepository implements ReservationImportRepository {
  private readonly imports = new Map<string, ImportRow>();
  private readonly stays = new Map<string, StayRow>();
  private seq = 0;
  private nowFn: () => Date;

  constructor(now: () => Date = () => new Date()) {
    this.nowFn = now;
  }

  /** Helper test: segna n° ospiti aggiunti a un soggiorno importato (simula l'arricchimento). */
  setGuestsAdded(stayId: string, count: number): void {
    const s = this.stays.get(stayId);
    if (s) s.guestsAdded = count;
  }

  async create(input: CreateReservationImportInput): Promise<{ id: string }> {
    const dup = [...this.imports.values()].find(
      (r) => r.propertyId === input.propertyId && r.url === input.url,
    );
    if (dup) throw new Error("Unique constraint (propertyId,url)");
    const id = `imp_${++this.seq}`;
    this.imports.set(id, {
      id,
      organizationId: input.organizationId,
      propertyId: input.propertyId,
      url: input.url,
      source: input.source,
      lastSyncAt: null,
      lastError: null,
      lastImported: 0,
    });
    return { id };
  }

  async remove(importId: string, organizationId: string): Promise<void> {
    const r = this.imports.get(importId);
    if (r && r.organizationId === organizationId) this.imports.delete(importId);
  }

  async listByProperty(
    propertyId: string,
    organizationId: string,
  ): Promise<ReservationImportView[]> {
    return [...this.imports.values()]
      .filter((r) => r.propertyId === propertyId && r.organizationId === organizationId)
      .map(toView);
  }

  async getById(importId: string, organizationId: string): Promise<ReservationImportView | null> {
    const r = this.imports.get(importId);
    if (!r || r.organizationId !== organizationId) return null;
    return toView(r);
  }

  async listImportedStays(importId: string): Promise<ExistingImportedStay[]> {
    return [...this.stays.values()]
      .filter((s) => s.reservationImportId === importId)
      .map((s) => ({
        id: s.id,
        icalUid: s.icalUid,
        importStatus: s.importStatus,
        hasGuests: s.guestsAdded > 0,
        arrivalDate: s.arrivalDate,
        departureDate: s.departureDate,
      }));
  }

  async listImportedStaysForProperty(
    propertyId: string,
    organizationId: string,
  ): Promise<ImportedStayView[]> {
    return [...this.stays.values()]
      .filter((s) => s.propertyId === propertyId && s.organizationId === organizationId)
      .sort((a, b) => a.arrivalDate.getTime() - b.arrivalDate.getTime())
      .map((s) => ({
        id: s.id,
        icalUid: s.icalUid,
        importStatus: s.importStatus,
        importSource: s.importSource,
        arrivalDate: s.arrivalDate,
        departureDate: s.departureDate,
        guestsCount: s.guestsCount,
        guestsAdded: s.guestsAdded,
      }));
  }

  async applySync(input: ApplySyncInput): Promise<void> {
    const imp = this.imports.get(input.importId);
    for (const c of input.toCreate) {
      const id = `stay_${++this.seq}`;
      this.stays.set(id, {
        id,
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        reservationImportId: input.importId,
        icalUid: c.icalUid,
        importSource: input.source,
        importStatus: "DRAFT",
        arrivalDate: c.arrivalDate,
        departureDate: c.departureDate,
        guestsCount: 1,
        guestsAdded: 0,
      });
    }
    for (const u of input.toUpdate) {
      const s = this.stays.get(u.stayId);
      if (s) {
        s.arrivalDate = u.arrivalDate;
        s.departureDate = u.departureDate;
        s.importStatus = u.importStatus;
      }
    }
    for (const cancel of input.toCancel) {
      const s = this.stays.get(cancel.stayId);
      if (s) s.importStatus = cancel.importStatus;
    }
    if (imp) {
      imp.lastSyncAt = this.nowFn();
      imp.lastError = null;
      imp.lastImported = input.seen;
    }
  }

  async recordSyncError(importId: string, message: string): Promise<void> {
    const imp = this.imports.get(importId);
    if (imp) {
      imp.lastSyncAt = this.nowFn();
      imp.lastError = message;
    }
  }
}

function toView(r: ImportRow): ReservationImportView {
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
