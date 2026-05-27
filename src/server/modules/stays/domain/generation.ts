import {
  type CreateIntentInput,
  type ReferenceTables,
  type ResolverGuest,
  resolveTracciatoInput,
} from "../../alloggiati";

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GenerationError";
  }
}

const MS_PER_HOUR = 3_600_000;

/**
 * Deadline normativa di invio della schedina: arrivo +24h, o +6h se soggiorno breve (≤24h).
 * Pura: nessun accesso a DB/rete.
 */
export function computeSchedinaDeadline(arrivalDate: Date, isShortStay: boolean): Date {
  return new Date(arrivalDate.getTime() + (isShortStay ? 6 : 24) * MS_PER_HOUR);
}

// --- Finestra di INVIABILITÀ della data di arrivo --------------------------------------------
//
// VERIFICATO EMPIRICAMENTE in Fase D contro il sistema reale Alloggiati: una schedina è accettata
// SOLO se la data di arrivo è OGGI o IERI (calendario italiano). Date più vecchie o nel futuro →
// errore "Data di Arrivo Errata" (cod. 12). È coerente con la deadline di +24h: oltre, l'invio è
// comunque tardivo. Il confronto è per GIORNO DI CALENDARIO in fuso Europe/Rome, perché è quello
// che il server considera "oggi" (lo abbiamo osservato: il server usa la data italiana, non UTC).

const SEND_WINDOW_TZ = "Europe/Rome";

/** Data di `d` come "YYYY-MM-DD" nel fuso italiano. */
function romeYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEND_WINDOW_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export interface SendWindow {
  /** Data minima accettata = IERI ("YYYY-MM-DD", fuso italiano). */
  earliest: string;
  /** Data massima accettata = OGGI ("YYYY-MM-DD", fuso italiano). */
  latest: string;
}

/** Finestra delle date di arrivo accettate da Alloggiati: [ieri, oggi] in fuso italiano. */
export function computeSendWindow(now: Date = new Date()): SendWindow {
  const today = romeYmd(now);
  // "ieri" calcolato ancorando a mezzogiorno UTC del giorno di oggi → niente ambiguità di DST.
  const yesterday = romeYmd(new Date(Date.parse(`${today}T12:00:00Z`) - 24 * MS_PER_HOUR));
  return { earliest: yesterday, latest: today };
}

/** True se la data di arrivo cade nella finestra accettata da Alloggiati (oggi o ieri). */
export function isArrivalWithinSendWindow(arrivalDate: Date, now: Date = new Date()): boolean {
  const { earliest, latest } = computeSendWindow(now);
  const arrival = romeYmd(arrivalDate);
  return arrival === earliest || arrival === latest;
}

export interface GenerationStay {
  arrivalDate: Date;
  departureDate: Date | null;
  isShortStay: boolean;
}

/** Ospite già persistito (ha un id) pronto per la generazione. */
export type GenerationGuest = ResolverGuest & { id: string };

export interface GenerationContext {
  organizationId: string;
  credentialId: string;
  alloggiatiApartmentId: string | null;
  stay: GenerationStay;
  guests: GenerationGuest[];
}

/**
 * Soggiorno + ospiti → lista di intenti schedina (PENDING) per l'outbox.
 *
 * Valida TUTTI gli ospiti col resolver PRIMA di restituire: se un ospite ha dati mancanti
 * lancia un'eccezione e il chiamante non persiste nulla → niente schedine incomplete.
 * La dedup-key per ospite abilita l'anti-doppione lato repository (createIntent idempotente).
 */
export function buildSchedinaIntents(ctx: GenerationContext, refs: ReferenceTables): CreateIntentInput[] {
  if (ctx.guests.length === 0) {
    throw new GenerationError("Il soggiorno non ha ospiti: niente schedine da generare.");
  }
  const deadlineAt = computeSchedinaDeadline(ctx.stay.arrivalDate, ctx.stay.isShortStay);
  return ctx.guests.map((guest) => {
    const t = resolveTracciatoInput(guest, ctx.stay, refs);
    return {
      organizationId: ctx.organizationId,
      credentialId: ctx.credentialId,
      guestId: guest.id,
      deadlineAt,
      dedup: {
        struttura: ctx.credentialId,
        idAppartamento: ctx.alloggiatiApartmentId,
        dataArrivo: t.dataArrivo,
        numeroDocumento: t.numeroDocumento ?? "",
        cognome: t.cognome,
        nome: t.nome,
        dataNascita: t.dataNascita,
      },
    };
  });
}
