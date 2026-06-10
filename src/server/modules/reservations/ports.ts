import type { ReservationSource } from "@prisma/client";
import type { ExistingImportedStay, StayCancel, StayCreate, StayUpdate } from "./domain/reconcile";

// PORT del modulo Import prenotazioni (iCal).

/** Recupero del testo iCal da un URL. Astratto per testare il servizio senza rete. */
export interface ICalFetcher {
  /** Ritorna il corpo iCal grezzo. Lancia `ICalFetchError` su timeout/HTTP/contenuto non valido. */
  fetch(url: string): Promise<string>;
}

export class ICalFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ICalFetchError";
  }
}

/** Un feed iCal configurato su un immobile, come serve alla UI. */
export interface ReservationImportView {
  id: string;
  propertyId: string;
  url: string;
  source: ReservationSource;
  lastSyncAt: Date | null;
  lastError: string | null;
  lastImported: number;
}

/** Una prenotazione importata in bozza, come serve alla UI dell'immobile. */
export interface ImportedStayView {
  id: string;
  icalUid: string | null;
  importStatus: import("@prisma/client").StayImportStatus | null;
  importSource: ReservationSource | null;
  arrivalDate: Date;
  departureDate: Date | null;
  guestsCount: number;
  guestsAdded: number;
}

export interface CreateReservationImportInput {
  organizationId: string;
  propertyId: string;
  url: string;
  source: ReservationSource;
}

/** Dati di applicazione di un `SyncPlan` (vedi domain/reconcile). */
export interface ApplySyncInput {
  importId: string;
  organizationId: string;
  propertyId: string;
  source: ReservationSource;
  /** Numero di prenotazioni distinte viste nel feed (→ lastImported). */
  seen: number;
  toCreate: StayCreate[];
  toUpdate: StayUpdate[];
  toCancel: StayCancel[];
}

export interface ReservationImportRepository {
  /** Crea un feed per l'immobile. L'unicità (propertyId,url) è garantita a DB. */
  create(input: CreateReservationImportInput): Promise<{ id: string }>;
  /** Rimuove un feed (isolamento per organizationId). I soggiorni già importati restano. */
  remove(importId: string, organizationId: string): Promise<void>;
  /** Feed di un immobile (isolamento per organizationId). */
  listByProperty(propertyId: string, organizationId: string): Promise<ReservationImportView[]>;
  /** Un feed per id (isolamento per organizationId); null se non esiste/altra org. */
  getById(importId: string, organizationId: string): Promise<ReservationImportView | null>;
  /** Soggiorni già importati da un feed, con conteggio ospiti (per la riconciliazione). */
  listImportedStays(importId: string): Promise<ExistingImportedStay[]>;
  /** Prenotazioni importate da mostrare nell'immobile (tutti i feed dell'immobile). */
  listImportedStaysForProperty(
    propertyId: string,
    organizationId: string,
  ): Promise<ImportedStayView[]>;
  /** Applica il piano in transazione e aggiorna lo stato del feed (lastSyncAt, lastImported). */
  applySync(input: ApplySyncInput): Promise<void>;
  /** Registra un sync fallito: lastSyncAt = ora, lastError = messaggio. */
  recordSyncError(importId: string, message: string): Promise<void>;
}
