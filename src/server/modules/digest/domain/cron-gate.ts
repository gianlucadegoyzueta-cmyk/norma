// Gating PURO della route cron "digest settimanale".
//
// Stesso schema a DUE barriere del cron Alloggiati (vedi alloggiati/domain/cron-gate.ts), ma con
// un FLAG SEPARATO e DISTINTO: il digest NON deve poter girare per via dell'abilitazione di un
// altro job. È comunque email automatica in uscita → DISATTIVATO DI DEFAULT.
//
//  1. FLAG: gira solo se `DIGEST_ENABLED === "true"` (env Vercel, deciso dal founder).
//  2. AUTH: anche da abilitato, accetta SOLO il cron di Vercel, che invia
//     `Authorization: Bearer $CRON_SECRET`. Senza `CRON_SECRET` configurato si RIFIUTA di girare
//     (fail-closed: meglio non partire che partire non autenticati).
//
// NB: il segreto è condiviso (`CRON_SECRET`, lo stesso meccanismo di Vercel Cron), ma il FLAG di
// abilitazione è indipendente da quello degli invii Alloggiati — sono due interruttori separati.

export type DigestCronGate =
  /** Flag OFF: non si fa nulla, si risponde 200 (è lo stato voluto, non un errore). */
  | { kind: "disabled" }
  /** Flag ON ma richiesta non autenticata / segreto non configurato: 401. */
  | { kind: "unauthorized"; reason: string }
  /** Flag ON e richiesta autenticata: si esegue. */
  | { kind: "run" };

export interface DigestCronGateInput {
  /** Valore di `process.env.DIGEST_ENABLED`. */
  enabledFlag: string | undefined;
  /** Valore di `process.env.CRON_SECRET`. */
  cronSecret: string | undefined;
  /** Header `Authorization` della richiesta in arrivo. */
  authHeader: string | null | undefined;
}

export function evaluateDigestGate(input: DigestCronGateInput): DigestCronGate {
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
