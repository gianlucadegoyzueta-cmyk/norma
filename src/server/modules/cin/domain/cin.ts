// ============================================================
//  CIN — Codice Identificativo Nazionale (dominio PURO)
//
//  NORMA è system-of-record del CIN: l'host lo ottiene SOLO sul portale BDSR del Ministero del
//  Turismo (SPID/CIE) e lo INSERISCE qui — non esiste un'API per richiederlo. Qui validiamo il
//  formato in modo PRUDENTE e gestiamo lo stato di compliance. Nessuna chiamata di rete.
//
//  STRUTTURA NOTA del CIN: "IT" + cod. ISTAT provincia (3) + cod. ISTAT comune (3) +
//  codice classificazione tipologia (alfanumerico, es. "B1") + sequenza casuale alfanumerica (~5).
//  Esempio: IT039007B1XXXXX (~15 caratteri, maiuscoli alfanumerici dopo "IT").
//
//  ⚠️ TODO — CONFERMARE IL FORMATO CIN UFFICIALE sulla documentazione del Ministero del Turismo:
//  lunghezza esatta e codici di classificazione variano tra le fonti secondarie. Per NON rifiutare
//  CIN validi, la validazione è STRUTTURALE e TOLLERANTE (prefisso + charset + range di lunghezza),
//  non un pattern rigido. Stringere il check solo dopo verifica sulla fonte primaria.
// ============================================================

import type { CinStatus } from "@prisma/client";

/** Range di lunghezza tollerante (incl. "IT"). La forma tipica è ~15; teniamo margine. */
export const CIN_MIN_LENGTH = 12;
export const CIN_MAX_LENGTH = 17;

/** Normalizza un CIN per confronto/salvataggio: rimuove spazi interni/esterni e porta in maiuscolo. */
export function normalizeCin(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export type CinValidation = { valid: true; normalized: string } | { valid: false; reason: string };

/**
 * Validazione STRUTTURALE e prudente del formato CIN. Normalizza, poi verifica:
 *  - prefisso "IT";
 *  - dopo "IT" solo caratteri alfanumerici maiuscoli [A-Z0-9];
 *  - lunghezza totale entro [CIN_MIN_LENGTH, CIN_MAX_LENGTH].
 * NON valida i singoli codici ISTAT/classificazione (vedi TODO in testa al file): l'obiettivo è
 * intercettare errori grossolani senza rifiutare CIN reali.
 */
export function validateCinFormat(raw: string): CinValidation {
  const normalized = normalizeCin(raw);
  if (normalized.length === 0) return { valid: false, reason: "Il CIN è vuoto." };
  if (!normalized.startsWith("IT"))
    return { valid: false, reason: 'Il CIN deve iniziare con "IT".' };
  if (normalized.length < CIN_MIN_LENGTH || normalized.length > CIN_MAX_LENGTH) {
    return {
      valid: false,
      reason: `Lunghezza inattesa (${normalized.length}): un CIN ha di norma ${CIN_MIN_LENGTH}–${CIN_MAX_LENGTH} caratteri.`,
    };
  }
  const body = normalized.slice(2); // dopo "IT"
  if (!/^[A-Z0-9]+$/.test(body)) {
    return { valid: false, reason: "Dopo «IT» il CIN può contenere solo lettere e numeri." };
  }
  return { valid: true, normalized };
}

// ----------------------------- COMPLIANCE -----------------------------

/** Un immobile è in regola sul CIN solo se il CIN è stato OTTENUTO. */
export function isCinCompliant(status: CinStatus): boolean {
  return status === "OBTAINED";
}

/**
 * Vero se l'immobile DEVE ancora ottenere il CIN (→ va segnalato negli alert di compliance).
 * `NOT_REQUIRED` è escluso (l'host ha dichiarato che non serve); `OBTAINED` è a posto.
 */
export function propertyNeedsCin(status: CinStatus): boolean {
  return status !== "OBTAINED" && status !== "NOT_REQUIRED";
}

/** Promemoria d'obbligo per la UI: il CIN va esposto ovunque (online/offline) — sanzioni se assente. */
export const CIN_EXPOSURE_REMINDER =
  "Esponi il CIN in ogni annuncio (online e offline) e dentro/fuori l'immobile: è un obbligo di legge e l'assenza è sanzionata.";

// ----------------------- AGGANCIO DICHIARAZIONE (predisposto) -----------------------

/**
 * Espone il CIN di un immobile per l'inclusione nell'export della dichiarazione tassa di soggiorno
 * (modulo tourist-tax, altro branch). PURA e SENZA dipendenze da quel modulo: l'integrazione
 * effettiva nell'export avverrà al merge. Ritorna il CIN solo se OTTENUTO (altrimenti null: non si
 * espone un CIN inesistente/non confermato).
 */
export function cinForDeclarationExport(property: {
  cin: string | null;
  cinStatus: CinStatus;
}): string | null {
  return isCinCompliant(property.cinStatus) && property.cin ? property.cin : null;
}
