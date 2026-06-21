import type { ReservationSource } from "@prisma/client";
import { isReservationLike, parseICal, parseReservations } from "../domain/ical";
import { buildPreview, type PreviewReservation } from "../domain/preview";
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

/** Anteprima di un feed iCal PRIMA dell'import (nessuna scrittura a DB). */
export interface PreviewResult {
  source: ReservationSource;
  /** Prenotazioni trovate (dedup per UID), ordinate per arrivo. */
  reservations: PreviewReservation[];
  total: number;
  /** Eventi presenti nel feed ma scartati perché "date bloccate" (non prenotazioni). */
  blocked: number;
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
   * ANTEPRIMA (nessuna scrittura): valida l'URL, scarica e legge il feed, e restituisce le
   * prenotazioni trovate da mostrare PRIMA di importare. In caso di URL/rete/parsing errati
   * lancia un `ReservationsError` con messaggio gentile per l'utente. Non tocca il DB: si può
   * chiamare anche su un URL non ancora collegato.
   */
  async previewImport(rawUrl: string): Promise<PreviewResult> {
    const url = rawUrl.trim();
    if (!isValidICalUrl(url)) {
      throw new ReservationsError(
        "URL non valido: incolla il link iCal (https://…) del calendario della struttura.",
      );
    }

    let body: string;
    try {
      body = await this.fetcher.fetch(url);
    } catch (err) {
      throw new ReservationsError(
        err instanceof ICalFetchError
          ? err.message
          : "Errore imprevisto nel leggere il calendario.",
      );
    }

    const all = parseICal(body);
    const reservations = all.filter((e) => isReservationLike(e.summary));
    const preview = buildPreview(reservations);
    return {
      source: detectSource(url),
      reservations: preview.reservations,
      total: preview.total,
      blocked: all.length - reservations.length,
    };
  }

  /**
   * CONFERMA dell'anteprima: collega il feed e lo sincronizza subito, in un solo gesto per
   * l'host. Restituisce l'esito del sync + l'id del feed creato. Errori (URL duplicato, rete)
   * risalgono come `ReservationsError`.
   */
  async importNow(
    organizationId: string,
    propertyId: string,
    rawUrl: string,
  ): Promise<SyncResult & { importId: string }> {
    const { id } = await this.addImport(organizationId, propertyId, rawUrl);
    const result = await this.syncImport(id, organizationId);
    return { ...result, importId: id };
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

  /**
   * Re-sync di TUTTI i feed (cross-org), per il cron schedulato. Isola gli errori per feed
   * (uno rotto non ferma gli altri). NON invia nulla agli enti: aggiorna solo i soggiorni in bozza.
   */
  async syncAllFeeds(): Promise<{
    feeds: number;
    ok: number;
    failed: number;
    results: SyncResult;
  }> {
    const all = await this.repo.listAll();
    const agg: SyncResult = { created: 0, updated: 0, cancelled: 0, flaggedForReview: 0, seen: 0 };
    let ok = 0;
    let failed = 0;
    for (const f of all) {
      try {
        const r = await this.syncImport(f.id, f.organizationId);
        agg.created += r.created;
        agg.updated += r.updated;
        agg.cancelled += r.cancelled;
        agg.flaggedForReview += r.flaggedForReview;
        agg.seen += r.seen;
        ok += 1;
      } catch {
        failed += 1;
      }
    }
    return { feeds: all.length, ok, failed, results: agg };
  }
}
