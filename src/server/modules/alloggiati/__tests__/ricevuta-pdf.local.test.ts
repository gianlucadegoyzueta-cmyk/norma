import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { parseRicevutaSummaryPdfBase64 } from "../adapters/ricevuta-pdf-text";

// Test LOCALE sul PDF reale scaricato dal Gate #0. Il PDF contiene dati personali
// reali e NON è nel repo (tmp/ è gitignored): in CI questo test si salta da solo.
const REAL_PDF = join(process.cwd(), "tmp/gate0-ricevuta/ricevuta-2026-03-25.pdf");

describe.skipIf(!existsSync(REAL_PDF))("parseRicevutaSummaryPdfBase64 (PDF reale, locale)", () => {
  it("estrae i campi chiave dalla ricevuta reale del 2026-03-25", async () => {
    const base64 = readFileSync(REAL_PDF).toString("base64");
    const summary = await parseRicevutaSummaryPdfBase64(base64);

    // Campi chiave per la riconciliazione per conteggio.
    expect(summary.dataInvio).toBe("2026-03-25");
    expect(summary.schedineInviate).toBe(2);
    expect(summary.idRicevuta).toMatch(/^\d{4}\/\d+ \[[A-Z]{2}\]$/);

    // Best-effort: presenti nel campione reale.
    expect(summary.login).toMatch(/^[A-Z]{2}\d+$/);
    expect(summary.questura).toBe("ROMA");
    expect(summary.ggPermanenzaTotale).toBe(6);
  });

  it("rifiuta un payload non-PDF", async () => {
    const notPdf = Buffer.from("ciao").toString("base64");
    await expect(parseRicevutaSummaryPdfBase64(notPdf)).rejects.toThrow(/non è un PDF/);
  });
});
