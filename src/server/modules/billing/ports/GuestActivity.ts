// PORT: statistiche sull'attività "ospiti gestiti", input del trial app-side.
// Il dominio del gating (decideAccess) non sa COSA conta come ospite gestito: lo definisce
// l'adapter. Scelta v1: un Ospite (Guest) registrato dall'host = ospite gestito; il primo è
// il più vecchio per createdAt. Semplice, derivato dai dati, senza nuovi campi.

export interface ManagedGuestStats {
  managedGuestCount: number;
  /** createdAt del primo ospite gestito (per la finestra di grazia). Null se nessuno. */
  firstManagedGuestAt: Date | null;
}

export interface GuestActivityRepository {
  getManagedGuestStats(organizationId: string): Promise<ManagedGuestStats>;
}
