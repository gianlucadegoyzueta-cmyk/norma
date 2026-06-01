import { describe, expect, it } from "vitest";
import { isReceiptUnavailable, RICEVUTA_ERRORE_RECUPERO } from "../soap/receipt-codes";

describe("isReceiptUnavailable", () => {
  it("riconosce ERRORE_RECUPERO_RICEVUTA (Gate #0 live)", () => {
    expect(
      isReceiptUnavailable({
        esito: false,
        errorCod: RICEVUTA_ERRORE_RECUPERO,
      }),
    ).toBe(true);
  });

  it("non confonde con auth (cod. 1)", () => {
    expect(isReceiptUnavailable({ esito: false, errorCod: "1" })).toBe(false);
  });
});
