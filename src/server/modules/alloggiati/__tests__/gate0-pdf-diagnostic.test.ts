import { describe, expect, it } from "vitest";
import { analyzeReceiptPdfBuffer } from "../diagnostics/gate0-pdf";

describe("analyzeReceiptPdfBuffer (unit)", () => {
  it("riconosce magic %PDF-", () => {
    const buf = Buffer.from("%PDF-1.4\n1 0 obj\n(MARIO ROSSI) Tj", "latin1");
    const r = analyzeReceiptPdfBuffer(buf);
    expect(r.isPdfMagic).toBe(true);
    expect(r.printableSnippets.some((s) => s.includes("MARIO"))).toBe(true);
  });

  it("segnala payload non-PDF", () => {
    const buf = Buffer.from("not-a-pdf", "utf8");
    const r = analyzeReceiptPdfBuffer(buf);
    expect(r.isPdfMagic).toBe(false);
    expect(r.parserHints[0]).toContain("NON inizia con %PDF-");
  });
});
