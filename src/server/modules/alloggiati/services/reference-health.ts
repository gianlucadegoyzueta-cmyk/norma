import type { ReferenceCounts, ReferenceTableRepository } from "../ports/reference";

export interface ReferenceHealth {
  /** true SOLO se tutte le tabelle indispensabili al tracciato sono popolate. */
  ready: boolean;
  counts: ReferenceCounts;
  /** Messaggio pronto da loggare/mostrare. */
  message: string;
}

/**
 * Health-check delle tabelle di riferimento.
 *
 * IMPORTANTE: in produzione queste tabelle nascono VUOTE. Il prodotto è installato e funzionante,
 * ma NON può risolvere Comuni/Stati/Documenti — quindi non può generare schedine reali — finché
 * non si esegue `TableSyncService` con credenziali Alloggiati valide. Questo check lo rende esplicito
 * (es. da mostrare in dashboard o bloccare la generazione con un messaggio chiaro).
 */
export async function checkReferenceTablesHealth(
  repo: ReferenceTableRepository,
): Promise<ReferenceHealth> {
  const counts = await repo.counts();
  const empty: string[] = [];
  if (counts.comuni === 0) empty.push("Comuni");
  if (counts.countries === 0) empty.push("Stati");
  if (counts.documentTypes === 0) empty.push("Tipi Documento");

  if (empty.length > 0) {
    return {
      ready: false,
      counts,
      message:
        `Tabelle di riferimento vuote (${empty.join(", ")}). ` +
        "Il prodotto NON può ancora generare schedine reali: esegui TableSyncService con credenziali Alloggiati valide.",
    };
  }

  return {
    ready: true,
    counts,
    message: `Tabelle di riferimento popolate — Comuni: ${counts.comuni}, Stati: ${counts.countries}, Documenti: ${counts.documentTypes}.`,
  };
}
