// Gate condiviso per le route cron (Vercel Cron). PURO e testabile.
// Doppia barriera: (1) flag d'ambiente abilitante, (2) bearer CRON_SECRET nell'header Authorization.
// I cron sono DISATTIVATI di default: senza flag esplicito non fanno nulla.
//
// NB: quando il cron Alloggiati (feat/cron-send-reconcile) verrà mergiato, unificare la sua
// `domain/cron-gate.ts` su questa implementazione condivisa.

export interface CronGateInput {
  /** Valore del flag abilitante (es. process.env.ISTAT_CRON_ENABLED). Deve essere esattamente "true". */
  enabledFlag: string | undefined;
  /** Segreto atteso (process.env.CRON_SECRET). */
  cronSecret: string | undefined;
  /** Header Authorization della richiesta (es. "Bearer xyz"). */
  authHeader: string | null;
}

export interface CronGateResult {
  ok: boolean;
  status: number; // codice HTTP da restituire se !ok
  reason: string;
}

export function evaluateCronGate(input: CronGateInput): CronGateResult {
  if (input.enabledFlag !== "true") {
    return { ok: false, status: 503, reason: "cron disabilitato (flag non attivo)" };
  }
  if (!input.cronSecret) {
    return { ok: false, status: 500, reason: "CRON_SECRET non configurato" };
  }
  if (input.authHeader !== `Bearer ${input.cronSecret}`) {
    return { ok: false, status: 401, reason: "non autorizzato" };
  }
  return { ok: true, status: 200, reason: "ok" };
}
