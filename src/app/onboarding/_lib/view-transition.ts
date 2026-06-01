/**
 * Transizione fluida tra step del wizard via View Transitions API (supportata da Next 15 nei
 * browser moderni). Fallback trasparente: dove l'API non c'è, l'aggiornamento avviene comunque.
 */
type DocumentWithVT = Document & { startViewTransition?: (cb: () => void) => unknown };

export function startStepTransition(update: () => void): void {
  if (typeof document === "undefined") {
    update();
    return;
  }
  const doc = document as DocumentWithVT;
  if (typeof doc.startViewTransition === "function") {
    doc.startViewTransition(update);
  } else {
    update();
  }
}
