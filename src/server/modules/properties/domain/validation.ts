// Regole di dominio degli immobili (pure, senza I/O — facili da testare).
//
// Vincolo chiave [VERIFICATO, docs/alloggiati-web-architettura.md §4]: `AggiungiAppartamento`
// accetta SOLO Comuni "nella provincia di competenza dell'utente". ⇒ una credenziale Alloggiati
// copre UNA sola provincia, e un immobile collegato a quella credenziale DEVE trovarsi in un
// Comune di quella stessa provincia. Validiamo a monte, qui, così non si crea mai un immobile
// destinato a un rifiuto certo in fase di invio.

/** La sigla di una provincia (es. "RM"), normalizzata per il confronto. */
export function normalizeProvincia(sigla: string): string {
  return sigla.trim().toUpperCase();
}

/**
 * Vero se il Comune dell'immobile ricade nella provincia di competenza della credenziale.
 * Confronto case-insensitive sulla sigla (es. "rm" === "RM").
 */
export function comuneProvinciaMatchesCredential(
  comuneProvincia: string,
  credentialProvincia: string,
): boolean {
  return normalizeProvincia(comuneProvincia) === normalizeProvincia(credentialProvincia);
}
