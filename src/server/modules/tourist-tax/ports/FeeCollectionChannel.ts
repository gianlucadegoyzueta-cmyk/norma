// ============================================================
//  PORT: INCASSO REALE della commissione Norma (take-rate). PREDISPOSTO, NON IMPLEMENTATO.
//
//  ⛔ GATE MONETARIO/REGOLATORIO (decisione del founder, vincolante):
//     NON collegare movimenti di denaro reali. NON usare Stripe live. NON versare ai comuni.
//     Incassare per conto dell'host e poi rimettere al comune è MONEY TRANSMISSION: richiede
//     verifiche legali (Stripe Connect, contratti, eventuali autorizzazioni / licenze).
//
//  Questo port è la CERNIERA che renderà possibile l'incasso reale SENZA riscrivere il
//  dominio: il calcolo (domain/take-rate.ts) e lo snapshot in dichiarazione sono già pronti.
//  L'unico adapter fornito ora è uno STUB sicuro che NON muove denaro (vedi
//  adapters/fee-collection/StubFeeCollection.ts).
// ============================================================

import type { NormaFeeBreakdown } from "../domain/take-rate";

export interface FeeCollectionContext {
  declarationId: string;
  organizationId: string;
  /** Ripartizione già calcolata (lordo · fee Norma · netto comune). */
  fee: NormaFeeBreakdown;
}

export type FeeCollectionResult =
  /** L'unico esito possibile finché il gate monetario è chiuso. */
  | { kind: "NOT_IMPLEMENTED"; message: string }
  /** Predisposti per il futuro incasso reale: NON raggiungibili con lo stub attuale. */
  | { kind: "COLLECTED"; providerRef: string; collectedCents: number }
  | { kind: "REQUIRES_ACTION"; redirectUrl: string; message: string };

export interface FeeCollectionChannel {
  /** True solo quando un adapter reale è attivo. Lo stub di default è false. */
  readonly isImplemented: boolean;
  /**
   * Tenta di incassare la commissione Norma. Implementazione reale = TODO dietro il gate monetario:
   * Stripe Connect (transfer/application_fee verso l'account dell'host) + reconciliation.
   */
  collect(ctx: FeeCollectionContext): Promise<FeeCollectionResult>;
}
