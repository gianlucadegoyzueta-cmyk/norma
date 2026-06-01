/** Soglia oltre cui una schedina in SENDING è considerata "abbandonata" (crash a metà invio). */
export const SENDING_STALE_MS = 2 * 60 * 1000; // 2 min (> timeout SOAP default 20s)
