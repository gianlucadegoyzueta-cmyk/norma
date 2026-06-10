// GATING (dominio puro): decide se un'Organization ha accesso pieno (scrittura) o solo lettura.
//
// Regole di prodotto (spec corsia B — Piano Marketing):
//  - TRIAL legato al PRIMO UTILIZZO, non al tempo: accesso pieno e senza carta finché il
//    numero di ospiti gestiti è 0.
//  - Al primo ospite gestito scatta la richiesta di abbonamento, con una GRAZIA ragionevole
//    (giorni) per non interrompere il flusso di check-in in corso.
//  - Abbonamento attivo (o in grazia per pagamento in ritardo) = accesso pieno.
//  - Scaduto = blocco delle SOLE azioni di scrittura. La LETTURA è sempre permessa: i dati
//    sono dell'host.
//
// Funzione pura: nessun accesso a DB/Stripe. Gli input li prepara il servizio di gating.

import type { SubscriptionStatus } from "@prisma/client";

/** Giorni di grazia dopo il primo ospite gestito prima di bloccare le scritture. */
export const POST_FIRST_GUEST_GRACE_DAYS = 7;

export interface SubscriptionView {
  status: SubscriptionStatus | null;
  /** Fine del periodo pagato; usata come limite della grazia per i pagamenti in ritardo. */
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface GatingInput {
  /** Stato locale dell'abbonamento (specchio dei webhook Stripe), o null se mai abbonato. */
  subscription: SubscriptionView | null;
  /** Numero di ospiti "gestiti" dall'organizzazione (0 = trial pieno ancora attivo). */
  managedGuestCount: number;
  /** Quando è scattato il primo ospite gestito (per calcolare la grazia). Null se nessuno. */
  firstManagedGuestAt: Date | null;
  now: Date;
}

export type AccessState =
  | "TRIAL" // prova in corso: nessun ospite ancora gestito
  | "SUBSCRIBED" // abbonamento attivo
  | "GRACE" // accesso ancora pieno ma serve agire (pagamento in ritardo o grazia post-primo-ospite)
  | "EXPIRED"; // niente abbonamento e grazia finita → scritture bloccate

export type GraceReason = "PAYMENT_PAST_DUE" | "FIRST_GUEST";

export interface AccessDecision {
  state: AccessState;
  /** La lettura è SEMPRE concessa (i dati sono dell'host). Esplicito per chiarezza. */
  canRead: true;
  /** Azioni di scrittura permesse? */
  canWrite: boolean;
  /** Mostrare la CTA "Abbonati"/"Aggiorna pagamento"? */
  requiresSubscription: boolean;
  /** Se in grazia, perché; e fino a quando (per il copy del banner). */
  graceReason: GraceReason | null;
  graceEndsAt: Date | null;
}

type Entitlement = "ACTIVE" | "PAYMENT_GRACE" | "INACTIVE";

/**
 * Diritto derivante dal SOLO abbonamento Stripe (a prescindere dal trial applicativo):
 *  - ACTIVE/TRIALING → ACTIVE (anche se cancelAtPeriodEnd: resta attivo fino a fine periodo).
 *  - PAST_DUE → PAYMENT_GRACE finché entro currentPeriodEnd (Stripe ritenta l'incasso),
 *    altrimenti INACTIVE.
 *  - tutti gli altri (CANCELED, UNPAID, INCOMPLETE, PAUSED, null) → INACTIVE.
 */
function subscriptionEntitlement(sub: SubscriptionView | null, now: Date): Entitlement {
  if (!sub || sub.status == null) return "INACTIVE";
  switch (sub.status) {
    case "ACTIVE":
    case "TRIALING":
      return "ACTIVE";
    case "PAST_DUE":
      if (sub.currentPeriodEnd && now <= sub.currentPeriodEnd) return "PAYMENT_GRACE";
      return "INACTIVE";
    default:
      return "INACTIVE";
  }
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/** Decide l'accesso. Pura, deterministica, testabile. */
export function decideAccess(input: GatingInput): AccessDecision {
  const entitlement = subscriptionEntitlement(input.subscription, input.now);

  if (entitlement === "ACTIVE") {
    return {
      state: "SUBSCRIBED",
      canRead: true,
      canWrite: true,
      requiresSubscription: false,
      graceReason: null,
      graceEndsAt: null,
    };
  }

  if (entitlement === "PAYMENT_GRACE") {
    return {
      state: "GRACE",
      canRead: true,
      canWrite: true,
      requiresSubscription: true,
      graceReason: "PAYMENT_PAST_DUE",
      graceEndsAt: input.subscription?.currentPeriodEnd ?? null,
    };
  }

  // Nessun abbonamento attivo: si applica la logica del trial "fino al primo ospite".
  if (input.managedGuestCount <= 0) {
    return {
      state: "TRIAL",
      canRead: true,
      canWrite: true,
      requiresSubscription: false,
      graceReason: null,
      graceEndsAt: null,
    };
  }

  // Primo ospite già gestito: grazia di alcuni giorni per non interrompere il flusso.
  const graceEndsAt = input.firstManagedGuestAt
    ? addDays(input.firstManagedGuestAt, POST_FIRST_GUEST_GRACE_DAYS)
    : null;
  const inGrace = graceEndsAt != null && input.now < graceEndsAt;

  if (inGrace) {
    return {
      state: "GRACE",
      canRead: true,
      canWrite: true,
      requiresSubscription: true,
      graceReason: "FIRST_GUEST",
      graceEndsAt,
    };
  }

  return {
    state: "EXPIRED",
    canRead: true,
    canWrite: false,
    requiresSubscription: true,
    graceReason: null,
    graceEndsAt: null,
  };
}
