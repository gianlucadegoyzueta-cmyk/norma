import type { SchedinaStatus } from "@prisma/client";

/**
 * Presentazione UNICA degli stati schedina (etichetta + classe badge "cmx").
 * Prima viveva duplicata in tre punti (outbox `/schedine`, lista soggiorni, dettaglio soggiorno)
 * con esiti divergenti: il dettaglio soggiorno NON mappava `NEEDS_REVIEW` e mostrava "No schedina"
 * — fuorviante, perché la schedina esiste ed è ferma in attesa di revisione umana.
 *
 * Sorgente di verità SOLO presentazionale: nessuna logica d'invio, nessun lato server.
 * Le classi `cmx-badge-*` sono definite in `concierge-page.css`.
 */
export interface SchedinaStatusDisplay {
  /** Etichetta breve mostrata nel badge (es. "Da inviare"). */
  label: string;
  /** Classe badge concierge (verde = ok, neutra = attesa, rossa = errore). */
  badgeClass: string;
}

/** Etichetta usata quando un ospite non ha ancora alcuna schedina (assenza, non uno stato). */
export const NO_SCHEDINA_LABEL = "Nessuna schedina";

const STATUS_DISPLAY: Record<SchedinaStatus, SchedinaStatusDisplay> = {
  PENDING: { label: "Da inviare", badgeClass: "cmx-badge-wait" },
  SENDING: { label: "In invio", badgeClass: "cmx-badge-wait" },
  ACQUIRED: { label: "Acquisita", badgeClass: "cmx-badge-ok" },
  REJECTED: { label: "Respinta", badgeClass: "cmx-badge-err" },
  UNVERIFIED: { label: "Da verificare", badgeClass: "cmx-badge-wait" },
  NEEDS_REVIEW: { label: "Da rivedere", badgeClass: "cmx-badge-err" },
};

/** Presentazione di uno stato schedina noto. */
export function schedinaStatusDisplay(status: SchedinaStatus): SchedinaStatusDisplay {
  return STATUS_DISPLAY[status];
}

/**
 * Presentazione tollerante per valori che arrivano come stringa libera (es. `schedinaStatus`
 * proiettato dal dominio). `null`/sconosciuto → assenza schedina, non uno stato fittizio.
 */
export function schedinaStatusDisplayOrNull(
  status: string | null | undefined,
): SchedinaStatusDisplay | null {
  if (!status) return null;
  return STATUS_DISPLAY[status as SchedinaStatus] ?? null;
}
