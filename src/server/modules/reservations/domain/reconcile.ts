import type { StayImportStatus } from "@prisma/client";
import type { ParsedReservation } from "./ical";

// Riconciliazione PURA tra il feed iCal appena letto e i Soggiorni già importati da quel feed.
// È il cuore delle "regole di prodotto già prese" (vedi spec lane-a-ical):
//  - un evento = un soggiorno, UID iCal = chiave di dedup (upsert su re-sync);
//  - evento sparito dal feed → il soggiorno bozza si annulla SOLO se ancora bozza (niente ospiti);
//    se l'host l'ha già arricchito (ospiti inseriti) si SEGNALA ("verifica annullamento") e non si tocca.

/** Stato di un Soggiorno importato, come serve alla riconciliazione (no I/O). */
export interface ExistingImportedStay {
  id: string;
  icalUid: string;
  importStatus: StayImportStatus;
  /** true se l'host ha già inserito almeno un ospite (soggiorno "arricchito"). */
  hasGuests: boolean;
  arrivalDate: Date;
  departureDate: Date | null;
}

export interface StayCreate {
  icalUid: string;
  arrivalDate: Date;
  departureDate: Date | null;
}

export interface StayUpdate {
  stayId: string;
  arrivalDate: Date;
  departureDate: Date | null;
  /** Normalizzato a DRAFT: l'evento è (ri)presente nel feed, quindi attivo. */
  importStatus: Extract<StayImportStatus, "DRAFT">;
}

export interface StayCancel {
  stayId: string;
  importStatus: Extract<StayImportStatus, "CANCELLED" | "NEEDS_CANCEL_REVIEW">;
}

/** Piano di sincronizzazione: cosa creare, aggiornare, annullare/segnalare. */
export interface SyncPlan {
  toCreate: StayCreate[];
  toUpdate: StayUpdate[];
  toCancel: StayCancel[];
  /** Quante prenotazioni distinte sono presenti nel feed (per il riepilogo UI). */
  seen: number;
}

function sameInstant(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.getTime() === b.getTime();
}

/**
 * Calcola il piano di sync. Idempotente: rieseguito su un feed invariato produce
 * `toCreate`/`toUpdate`/`toCancel` vuoti.
 */
export function reconcile(parsed: ParsedReservation[], existing: ExistingImportedStay[]): SyncPlan {
  const existingByUid = new Map(existing.map((e) => [e.icalUid, e]));

  // Dedup del feed stesso: due VEVENT con lo stesso UID → vince l'ultimo letto.
  const feedByUid = new Map<string, ParsedReservation>();
  for (const ev of parsed) feedByUid.set(ev.uid, ev);

  const toCreate: StayCreate[] = [];
  const toUpdate: StayUpdate[] = [];

  for (const ev of feedByUid.values()) {
    const match = existingByUid.get(ev.uid);
    if (!match) {
      toCreate.push({
        icalUid: ev.uid,
        arrivalDate: ev.arrivalDate,
        departureDate: ev.departureDate,
      });
      continue;
    }
    // L'evento è (ancora/di nuovo) nel feed → soggiorno attivo: stato DRAFT, date allineate.
    const datesChanged =
      !sameInstant(match.arrivalDate, ev.arrivalDate) ||
      !sameInstant(match.departureDate, ev.departureDate);
    const statusChanged = match.importStatus !== "DRAFT";
    if (datesChanged || statusChanged) {
      toUpdate.push({
        stayId: match.id,
        arrivalDate: ev.arrivalDate,
        departureDate: ev.departureDate,
        importStatus: "DRAFT",
      });
    }
  }

  const toCancel: StayCancel[] = [];
  for (const e of existing) {
    if (feedByUid.has(e.icalUid)) continue; // ancora presente: gestito sopra
    // Sparito dal feed. Se già annullato/segnalato in un sync precedente, niente da fare.
    if (e.importStatus === "CANCELLED" || e.importStatus === "NEEDS_CANCEL_REVIEW") continue;
    toCancel.push({
      stayId: e.id,
      // Arricchito dall'host → si segnala soltanto; ancora bozza → si annulla.
      importStatus: e.hasGuests ? "NEEDS_CANCEL_REVIEW" : "CANCELLED",
    });
  }

  return { toCreate, toUpdate, toCancel, seen: feedByUid.size };
}
