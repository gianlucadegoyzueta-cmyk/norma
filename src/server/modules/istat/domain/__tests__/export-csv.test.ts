import { describe, expect, it } from "vitest";
import type { IstatMonthlyReport } from "../aggregate";
import { toIstatCsv } from "../export-csv";

const REPORT: IstatMonthlyReport = {
  period: "2026-05",
  rows: [
    {
      provenance: { kind: "ESTERO", countryCode: "DE", countryName: "Germania" },
      label: "Germania",
      arrivi: 1,
      presenze: 5,
    },
    { provenance: { kind: "ITALIA", provincia: "RM" }, label: "RM", arrivi: 2, presenze: 3 },
  ],
  totals: { arrivi: 3, presenze: 8 },
};

describe("toIstatCsv", () => {
  it("produce intestazione, righe per provenienza e totale (separatore ;, CRLF)", () => {
    const csv = toIstatCsv(REPORT);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Periodo;2026-05");
    expect(lines[2]).toBe("Provenienza;Arrivi;Presenze");
    expect(lines[3]).toBe("Germania;1;5");
    expect(lines[4]).toBe("RM;2;3");
    expect(lines[5]).toBe("TOTALE;3;8");
  });

  it("quota i campi con il separatore", () => {
    const csv = toIstatCsv({
      ...REPORT,
      rows: [
        {
          provenance: { kind: "ESTERO", countryCode: "X", countryName: "Bosnia; Erzegovina" },
          label: "Bosnia; Erzegovina",
          arrivi: 1,
          presenze: 1,
        },
      ],
      totals: { arrivi: 1, presenze: 1 },
    });
    expect(csv).toContain('"Bosnia; Erzegovina";1;1');
  });
});
