// PORT del modulo Digest: astrazioni per (a) raccogliere i conteggi settimanali di un'organizzazione
// e (b) sapere a chi spedire. Il servizio resta testabile con un repository finto; l'invio riusa
// l'EmailSender del modulo Notifications (nessun nuovo canale).

import type { DigestDone, DigestPosition, DigestUpcoming } from "./domain/weekly-digest";

/** Finestra temporale [start, end) della settimana da riepilogare. */
export interface WeekWindow {
  /** Inizio incluso. */
  start: Date;
  /** Fine esclusa. */
  end: Date;
}

/** Destinatario del digest: un membro dell'organizzazione con email valida. */
export interface DigestRecipient {
  email: string;
  name: string | null;
}

/** Un'organizzazione con i suoi destinatari (calcolati a monte: OWNER/ADMIN con email). */
export interface OrgDigestTarget {
  organizationId: string;
  orgName: string;
  recipients: DigestRecipient[];
}

/** I conteggi grezzi della settimana + lo stato attuale di posizione (il dominio compone il testo). */
export interface WeeklyDigestFacts {
  done: DigestDone;
  upcoming: DigestUpcoming;
  position: DigestPosition;
}

export interface DigestRepository {
  /** Tutte le organizzazioni con almeno un destinatario valido. */
  listTargets(): Promise<OrgDigestTarget[]>;
  /** Conteggi reali di un'organizzazione per la finestra settimanale data. */
  gatherWeekly(organizationId: string, window: WeekWindow): Promise<WeeklyDigestFacts>;
}
