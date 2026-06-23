// Calcolo PURO della finestra "settimana scorsa" (lun–dom) da riepilogare nel digest del lunedì.
// Lavoriamo in UTC per determinismo (il digest è un riepilogo, non un atto con effetti legali al
// minuto): l'email del lunedì copre i 7 giorni della settimana ISO appena conclusa.

import type { WeekWindow } from "../ports";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Restituisce [lunedì scorso 00:00 UTC, questo lunedì 00:00 UTC): la settimana ISO conclusa.
 * Eseguito di lunedì, copre lun→dom precedenti. Eseguito un altro giorno, copre comunque
 * l'ultima settimana intera conclusa (deterministico, niente settimane parziali).
 */
export function previousWeekWindow(now: Date): WeekWindow {
  // Mezzanotte UTC di oggi.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // getUTCDay(): 0=domenica … 1=lunedì. Distanza dal lunedì di QUESTA settimana.
  const dow = today.getUTCDay();
  const daysSinceMonday = (dow + 6) % 7; // lun→0, mar→1, …, dom→6
  const thisMonday = new Date(today.getTime() - daysSinceMonday * DAY_MS);
  const lastMonday = new Date(thisMonday.getTime() - 7 * DAY_MS);
  return { start: lastMonday, end: thisMonday };
}
