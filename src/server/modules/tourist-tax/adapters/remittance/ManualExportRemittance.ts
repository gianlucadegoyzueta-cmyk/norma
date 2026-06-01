// Canale di versamento MANUALE — REALE e sempre disponibile.
// Produce il CSV della dichiarazione da scaricare; l'utente lo invia/versa sul canale del comune.

import type { TaxRemittanceMode } from "@prisma/client";
import { toDeclarationCsv } from "../../domain/export-csv";
import type {
  RemittanceChannel,
  RemittanceContext,
  RemittanceResult,
} from "../../ports/RemittanceChannel";

export class ManualExportRemittance implements RemittanceChannel {
  readonly mode: TaxRemittanceMode = "MANUAL_EXPORT";
  readonly isImplemented = true;

  async prepare(ctx: RemittanceContext): Promise<RemittanceResult> {
    const csv = toDeclarationCsv(ctx.exportData);
    const safePeriod = ctx.exportData.periodLabel.replace(/\s+/g, "_").toLowerCase();
    const safeComune = ctx.exportData.comuneName.replace(/\s+/g, "_").toLowerCase();
    return {
      kind: "EXPORT_READY",
      filename: `tassa-soggiorno_${safeComune}_${safePeriod}.csv`,
      mimeType: "text/csv;charset=utf-8",
      content: csv,
    };
  }
}
