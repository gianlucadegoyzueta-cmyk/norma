// Helper condiviso dalle operazioni LIVE contro il sistema REALE Alloggiati.
// Non è un test (non combacia con *.test.ts) e non è un prompt interattivo: resta CI-friendly.
// Stampa un banner ben visibile e attende qualche secondo, così c'è il tempo di annullare con
// Ctrl-C PRIMA che parta qualsiasi chiamata di rete.

export async function alloggiatiLiveBanner(action: string, seconds = 5): Promise<void> {
  const line = "═".repeat(76);
  console.warn(`\n${line}`);
  console.warn("⚠️  ATTENZIONE — connessione al sistema REALE Alloggiati Web (Polizia di Stato).");
  console.warn(`    Azione: ${action}`);
  console.warn(
    "    Credenziali usate: ALLOGGIATI_UTENTE / ALLOGGIATI_PASSWORD / ALLOGGIATI_WSKEY.",
  );
  console.warn(`    >> Premi Ctrl-C entro ${seconds} secondi per ANNULLARE. <<`);
  console.warn(`${line}\n`);
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}
