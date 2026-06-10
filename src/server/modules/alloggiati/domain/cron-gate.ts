// Gating PURO della route cron "invio + riconciliazione".
//
// DUE barriere, in quest'ordine:
//  1. FLAG: il job è DISATTIVATO DI DEFAULT. Gira solo se `ALLOGGIATI_CRON_ENABLED === "true"`.
//     Motivo (guardrail CLAUDE.md): l'invio reale verso la Questura non si accende in autonomia;
//     lo abilita Gianluca, consapevolmente, settando l'env su Vercel.
//  2. AUTH: anche da abilitato, la route accetta SOLO il cron di Vercel, che invia
//     `Authorization: Bearer $CRON_SECRET`. Senza `CRON_SECRET` configurato si RIFIUTA di girare
//     (fail-closed: meglio non partire che partire non autenticati).

export type CronGate =
  /** Flag OFF: non si fa nulla, si risponde 200 (è lo stato voluto, non un errore). */
  | { kind: "disabled" }
  /** Flag ON ma richiesta non autenticata / segreto non configurato: 401. */
  | { kind: "unauthorized"; reason: string }
  /** Flag ON e richiesta autenticata: si esegue. */
  | { kind: "run" };

export interface CronGateInput {
  /** Valore di `process.env.ALLOGGIATI_CRON_ENABLED`. */
  enabledFlag: string | undefined;
  /** Valore di `process.env.CRON_SECRET`. */
  cronSecret: string | undefined;
  /** Header `Authorization` della richiesta in arrivo. */
  authHeader: string | null | undefined;
}

export function evaluateCronGate(input: CronGateInput): CronGate {
  if (input.enabledFlag !== "true") {
    return { kind: "disabled" };
  }
  if (!input.cronSecret || input.cronSecret.length === 0) {
    // Abilitato ma senza segreto: configurazione incompleta → non partire (fail-closed).
    return { kind: "unauthorized", reason: "CRON_SECRET non configurato" };
  }
  if (input.authHeader !== `Bearer ${input.cronSecret}`) {
    return { kind: "unauthorized", reason: "Authorization mancante o non valida" };
  }
  return { kind: "run" };
}
