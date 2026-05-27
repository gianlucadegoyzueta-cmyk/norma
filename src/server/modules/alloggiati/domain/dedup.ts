import { createHash } from "node:crypto";
import type { DedupKeyInput } from "./types";

/**
 * Normalizza un campo testuale: trim, maiuscolo, spazi multipli compattati.
 * Rende la chiave robusta a differenze irrilevanti (es. "  rossi " ≡ "Rossi").
 */
function norm(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

/**
 * Calcola la dedup-key DETERMINISTICA di una schedina.
 * Stessa schedina logica → stessa chiave: è ciò che permette al vincolo UNIQUE
 * (organizationId, dedupKey) di bloccare i doppioni (irreversibili su Alloggiati).
 *
 * Funzione PURA: nessun accesso a rete o database → facilmente testabile.
 */
export function computeDedupKey(input: DedupKeyInput): string {
  const parts = [
    norm(input.struttura),
    input.idAppartamento ? norm(input.idAppartamento) : "",
    input.dataArrivo.trim(),
    norm(input.numeroDocumento),
    norm(input.cognome),
    norm(input.nome),
    input.dataNascita.trim(),
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex");
}
