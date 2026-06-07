import { describe, expect, it } from "vitest";
import type { DeclarationExport } from "../export-csv";
import { toDeclarationPdf } from "../export-pdf";

const SAMPLE: DeclarationExport = {
  comuneName: "Roma",
  periodLabel: "maggio 2026",
  totalCents: 4500,
  lines: [
    {
      propertyName: "Casa Trastevere",
      cin: "IT058091ABC123",
      stayId: "s1",
      taxedNights: 3,
      amountCents: 1500,
    },
    { propertyName: "Loft Monti", cin: null, stayId: "s2", taxedNights: 6, amountCents: 3000 },
  ],
};

describe("toDeclarationPdf", () => {
  it("produce un PDF valido (header %PDF) non vuoto", async () => {
    const bytes = await toDeclarationPdf(SAMPLE);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(800);
    // I primi byte di ogni PDF sono la firma "%PDF-".
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
  });

  it("non lancia con molte righe (paginazione) né con caratteri fuori WinAnsi", async () => {
    const many: DeclarationExport = {
      comuneName: "Sant'Anatolia di Narco — 日本",
      periodLabel: "2026",
      totalCents: 100000,
      lines: Array.from({ length: 60 }, (_, i) => ({
        propertyName: `Immobile ${i} — ☃`,
        cin: i % 2 === 0 ? `CIN${i}` : null,
        stayId: `s${i}`,
        taxedNights: i + 1,
        amountCents: 1000 + i,
      })),
    };
    const bytes = await toDeclarationPdf(many);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(2000);
  });

  it("è deterministico nella struttura (stesso input → stessa lunghezza)", async () => {
    const a = await toDeclarationPdf(SAMPLE);
    const b = await toDeclarationPdf(SAMPLE);
    expect(a.length).toBe(b.length);
  });
});
