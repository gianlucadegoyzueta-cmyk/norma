import { describe, expect, it } from "vitest";
import { shareFile, toBase64Utf8 } from "../share";

describe("toBase64Utf8", () => {
  it("codifica testo con accenti in base64 round-trippabile", () => {
    const text = "Soggiorno — città di Núoro €120";
    const b64 = toBase64Utf8(text);
    // Decodifica: base64 → bytes → UTF-8.
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    expect(new TextDecoder().decode(bytes)).toBe(text);
  });
});

describe("shareFile", () => {
  it("su web (non nativo) ritorna false senza lanciare", async () => {
    await expect(shareFile("doc.pdf", toBase64Utf8("x"))).resolves.toBe(false);
  });
});
