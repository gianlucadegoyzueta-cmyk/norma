// PORT: canale di VERSAMENTO della dichiarazione al comune.
//
// MANUAL_EXPORT è il default sicuro e SEMPRE disponibile (l'utente scarica l'export e versa).
// GECOS / pagoPA / portale comunale sono PREDISPOSTI come adapter stub: attivabili per comune
// senza riscrivere il dominio. Questo port è la cerniera che lo consente.

import type { TaxRemittanceMode } from "@prisma/client";
import type { DeclarationExport } from "../domain/export-csv";

export interface RemittanceContext {
  declarationId: string;
  organizationId: string;
  exportData: DeclarationExport;
}

export type RemittanceResult =
  | { kind: "EXPORT_READY"; filename: string; mimeType: string; content: string }
  | { kind: "REDIRECT"; url: string; message: string }
  | { kind: "NOT_IMPLEMENTED"; message: string };

export interface RemittanceChannel {
  readonly mode: TaxRemittanceMode;
  /** True se il canale è realmente operativo (non uno stub). */
  readonly isImplemented: boolean;
  prepare(ctx: RemittanceContext): Promise<RemittanceResult>;
}
