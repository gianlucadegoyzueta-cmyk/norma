import { describe, expect, it } from "vitest";
import { buildSendSummary, isEmptySummary, type SentRow, summaryLine } from "../send-summary";

const row = (
  status: string,
  guestName = "Mario Rossi",
  cod: string | null = null,
  des: string | null = null,
): SentRow => ({ status, guestName, lastErrorCod: cod, lastErrorDes: des });

describe("buildSendSummary", () => {
  it("conta per esito e raccoglie le respinte con messaggio mappato", () => {
    const s = buildSendSummary([
      row("ACQUIRED"),
      row("ACQUIRED"),
      row("ACQUIRED"),
      row("REJECTED", "Anna Bianchi", "12", "Data arrivo errata"),
      row("UNVERIFIED"),
    ]);
    expect(s.acquired).toBe(3);
    expect(s.rejected).toBe(1);
    expect(s.unverified).toBe(1);
    expect(s.rejectedRows).toHaveLength(1);
    expect(s.rejectedRows[0].guestName).toBe("Anna Bianchi");
    // cod 12 è mappato → messaggio azionabile, non la descrizione grezza
    expect(s.rejectedRows[0].message).toMatch(/data di arrivo/i);
  });

  it("usa la descrizione grezza del portale per i codici non mappati", () => {
    const s = buildSendSummary([row("REJECTED", "X", "999", "Errore sconosciuto del portale")]);
    expect(s.rejectedRows[0].message).toBe("Errore sconosciuto del portale");
  });

  it("ignora le righe PENDING/SENDING residue (claim non riuscito)", () => {
    const s = buildSendSummary([row("PENDING"), row("SENDING")]);
    expect(isEmptySummary(s)).toBe(true);
    expect(s.rejectedRows).toHaveLength(0);
  });
});

describe("summaryLine", () => {
  it("pluralizza in italiano e omette gli esiti a zero", () => {
    expect(summaryLine({ acquired: 3, rejected: 1, unverified: 1, rejectedRows: [] })).toBe(
      "3 acquisite · 1 respinta · 1 da verificare",
    );
    expect(summaryLine({ acquired: 1, rejected: 0, unverified: 0, rejectedRows: [] })).toBe(
      "1 acquisita",
    );
    expect(summaryLine({ acquired: 0, rejected: 2, unverified: 0, rejectedRows: [] })).toBe(
      "2 respinte",
    );
    expect(summaryLine({ acquired: 0, rejected: 0, unverified: 0, rejectedRows: [] })).toBe("");
  });
});
