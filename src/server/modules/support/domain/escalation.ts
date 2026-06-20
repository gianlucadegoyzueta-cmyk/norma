// Dominio dell'escalation: costruisce il messaggio con cui si avvisa il founder di un nuovo
// ticket. Puro (nessun I/O) → testabile e indipendente dal canale (email oggi, Slack domani).

/** Corpo dell'email che avvisa il founder che un host attende una risposta umana. */
export function buildFounderEmail(
  ticketId: string,
  question: string,
): { subject: string; text: string } {
  const ref = ticketId.slice(0, 8);
  return {
    subject: `[Norma · supporto] Nuovo ticket #${ref}`,
    text: [
      "Un host ha posto una domanda a cui l'assistente AI non ha saputo rispondere con certezza.",
      "",
      `Domanda: ${question}`,
      "",
      `Ticket: ${ticketId}`,
      "Rispondi all'host appena puoi.",
    ].join("\n"),
  };
}
