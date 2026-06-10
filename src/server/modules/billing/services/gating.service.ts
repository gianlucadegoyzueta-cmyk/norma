// Servizio di gating: assembla gli input (abbonamento + attività ospiti) e delega la
// DECISIONE al dominio puro (decideAccess). È il punto unico da chiamare in guard/middleware
// e nella UI per sapere se l'organizzazione può scrivere.

import { decideAccess, type AccessDecision } from "../domain/access";
import type { GuestActivityRepository } from "../ports/GuestActivity";
import type { SubscriptionRepository } from "../ports/SubscriptionRepository";

/** Sollevato quando un'azione di SCRITTURA è tentata senza accesso (trial scaduto, niente abbonamento). */
export class WriteAccessDeniedError extends Error {
  constructor(readonly access: AccessDecision) {
    super("Accesso in sola lettura: serve un abbonamento attivo per modificare i dati.");
    this.name = "WriteAccessDeniedError";
  }
}

export class BillingGatingService {
  constructor(
    private readonly subscriptions: SubscriptionRepository,
    private readonly guests: GuestActivityRepository,
  ) {}

  async getAccess(organizationId: string, now: Date = new Date()): Promise<AccessDecision> {
    const [sub, stats] = await Promise.all([
      this.subscriptions.getByOrganization(organizationId),
      this.guests.getManagedGuestStats(organizationId),
    ]);

    return decideAccess({
      subscription: sub
        ? {
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          }
        : null,
      managedGuestCount: stats.managedGuestCount,
      firstManagedGuestAt: stats.firstManagedGuestAt,
      now,
    });
  }

  /**
   * Guard per le azioni di scrittura: ritorna la decisione se permessa, altrimenti lancia
   * WriteAccessDeniedError. Da chiamare all'inizio delle server action che MODIFICANO i dati.
   * La lettura non passa mai di qui (è sempre permessa).
   */
  async requireWriteAccess(
    organizationId: string,
    now: Date = new Date(),
  ): Promise<AccessDecision> {
    const access = await this.getAccess(organizationId, now);
    if (!access.canWrite) throw new WriteAccessDeniedError(access);
    return access;
  }
}
