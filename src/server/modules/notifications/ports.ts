// PORT del modulo Notifications: astrazione dell'invio email, così il dominio e i servizi
// non dipendono dal canale concreto (Resend) e i test usano un transport finto.

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/** Invio di una singola email transazionale. L'implementazione reale riusa il canale Resend. */
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}
