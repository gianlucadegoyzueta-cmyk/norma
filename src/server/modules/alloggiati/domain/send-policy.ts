/**
 * Politica di tentativi dell'outbox.
 *
 * Ogni invio (claim PENDING→SENDING) incrementa `attempts` di UNA unità, una sola volta per
 * tentativo (l'incremento è di esclusiva competenza di `claimForSending`). Oltre `MAX_SEND_ATTEMPTS`
 * tentativi cumulati una schedina NON viene più rivendicata automaticamente dall'outbox: si evita
 * il retry "runaway" su una riga che fallisce sistematicamente (es. rifiuti ripetuti) e la si lascia
 * ferma in PENDING, in attesa di intervento umano.
 *
 * Nota: in assenza (per ora) di uno stato dedicato NEEDS_REVIEW (richiederebbe una migrazione
 * dell'enum), la schedina esaurita resta PENDING ma inerte (non auto-inviata). Il follow-up con lo
 * stato NEEDS_REVIEW per renderla esplicita nella UI è tracciato a parte.
 */
export const MAX_SEND_ATTEMPTS = 5;

/** True se la schedina ha esaurito i tentativi automatici di invio. */
export function hasExhaustedSendAttempts(attempts: number): boolean {
  return attempts >= MAX_SEND_ATTEMPTS;
}
