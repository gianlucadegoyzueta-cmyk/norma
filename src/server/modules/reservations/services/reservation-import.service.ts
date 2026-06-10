import { parseReservations } from "../domain/ical";
import { reconcile } from "../domain/reconcile";
import { detectSource, isValidICalUrl } from "../domain/source";
import { ICalFetchError, type ICalFetcher, type ReservationImportRepository } from "../ports";

export class ReservationsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReservationsError";
  }
}

/** Esito di un sync (per il feedback in UI). */
export interface SyncResult {
  created: number;
  updated: number;
  cancelled: number;
  flaggedForReview: number;
  seen: number;
}

/**
 * Servizio di import prenotazioni via iCal. Orchestrazione:
 *  - aggiunta/rimozione di un feed iCal su un immobile (con dedup dell'URL a DB);
 *  - sync: scarica il feed, riconcilia (dedup per UID, regole di annullamento) e applica.
 * NON invia nulla ad Alloggiati: si ferma a "Soggiorni bozza pronti da completare".
 */
export class ReservationImportService {
  constructor(
    private readonly repo: ReservationImportRepository,
    private readonly fetcher: ICalFetcher,
  ) {}

  async addImport(
    organizationId: string,
    propertyId: string,
    rawUrl: string,
  ): Promise<{ id: string }> {
    const url = rawUrl.trim();
    if (!isValidICalUrl(url)) {
      throw new ReservationsError(
        "URL non valido: incolla il link iCal (https://…) del calendario della struttura.",
      );
    }
    try {
      return await this.repo.create({
        organizationId,
        propertyId,
        url,
        source: detectSource(url),
      });
    } catch {
      // Violazione unique (propertyId,url) o altro errore di persistenza.
      throw new ReservationsError("Questo calendario è già collegato a questo immobile.");
    }
  }

  async removeImport(importId: string, organizationId: string): Promise<void> {
    await this.repo.remove(importId, organizationId);
  }

  /**
   * Sincronizza UN feed. In caso di errore di rete/parsing registra `lastError` sul feed
   * (così la UI lo mostra) e rilancia un `ReservationsError` con messaggio per l'utente.
   */
  async syncImport(importId: string, organizationId: string): Promise<SyncResult> {
    const imp = await this.repo.getById(importId, organizationId);
    if (!imp) throw new ReservationsError("Calendario non trovato per questa organizzazione.");

    let body: string;
    try {
      body = await this.fetcher.fetch(imp.url);
    } catch (err) {
      const message =
        err instanceof ICalFetchError
          ? err.message
          : "Errore imprevisto nel leggere il calendario.";
      await this.repo.recordSyncError(importId, message);
      throw new ReservationsError(message);
    }

    const parsed = parseReservations(body);
    const existing = await this.repo.listImportedStays(importId);
    const plan = reconcile(parsed, existing);

    await this.repo.applySync({
      importId,
      organizationId,
      propertyId: imp.propertyId,
      source: imp.source,
      seen: plan.seen,
      toCreate: plan.toCreate,
      toUpdate: plan.toUpdate,
      toCancel: plan.toCancel,
    });

    return {
      created: plan.toCreate.length,
      updated: plan.toUpdate.length,
      cancelled: plan.toCancel.filter((c) => c.importStatus === "CANCELLED").length,
      flaggedForReview: plan.toCancel.filter((c) => c.importStatus === "NEEDS_CANCEL_REVIEW")
        .length,
      seen: plan.seen,
    };
  }

  /** Sincronizza TUTTI i feed di un immobile; aggrega gli esiti. Non interrompe agli errori. */
  async syncProperty(
    propertyId: string,
    organizationId: string,
  ): Promise<{ results: SyncResult; errors: string[] }> {
    const imports = await this.repo.listByProperty(propertyId, organizationId);
    const agg: SyncResult = { created: 0, updated: 0, cancelled: 0, flaggedForReview: 0, seen: 0 };
    const errors: string[] = [];
    for (const imp of imports) {
      try {
        const r = await this.syncImport(imp.id, organizationId);
        agg.created += r.created;
        agg.updated += r.updated;
        agg.cancelled += r.cancelled;
        agg.flaggedForReview += r.flaggedForReview;
        agg.seen += r.seen;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "Errore di sincronizzazione.");
      }
    }
    return { results: agg, errors };
  }
}
