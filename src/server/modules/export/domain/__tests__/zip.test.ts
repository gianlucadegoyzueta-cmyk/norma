import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "../zip";

const enc = new TextEncoder();
const dec = new TextDecoder();

function u32le(b: Uint8Array, off: number): number {
  return (b[off] | (b[off + 1] << 8) | (b[off + 2] << 16) | (b[off + 3] << 24)) >>> 0;
}
function u16le(b: Uint8Array, off: number): number {
  return b[off] | (b[off + 1] << 8);
}

describe("crc32", () => {
  it("calcola il valore noto di '123456789'", () => {
    expect(crc32(enc.encode("123456789"))).toBe(0xcbf43926);
  });
  it("stringa vuota → 0", () => {
    expect(crc32(new Uint8Array(0))).toBe(0);
  });
});

describe("buildZip", () => {
  it("inizia con la firma local file header e termina con l'EOCD", () => {
    const zip = buildZip([{ name: "a.txt", data: enc.encode("hi") }]);
    expect(u32le(zip, 0)).toBe(0x04034b50); // PK\x03\x04
    // EOCD: gli ultimi 22 byte (nessun commento).
    const eocd = zip.length - 22;
    expect(u32le(zip, eocd)).toBe(0x06054b50);
    expect(u16le(zip, eocd + 10)).toBe(1); // total entries
  });

  it("è deterministico (stessi byte per gli stessi input)", () => {
    const mk = () => buildZip([{ name: "x.csv", data: enc.encode("a;b\r\n1;2") }]);
    expect(Array.from(mk())).toEqual(Array.from(mk()));
  });

  it("memorizza il contenuto verbatim (store) e recuperabile dall'offset del local header", () => {
    const content = "Comune;Periodo\r\nRoma;2026-05";
    const zip = buildZip([{ name: "tasse.csv", data: enc.encode(content) }]);
    // Local header: nome a offset 30, dati subito dopo nome+extra.
    const nameLen = u16le(zip, 26);
    const extraLen = u16le(zip, 28);
    const dataStart = 30 + nameLen + extraLen;
    const size = u32le(zip, 22); // uncompressed size
    const stored = dec.decode(zip.subarray(dataStart, dataStart + size));
    expect(stored).toBe(content);
    expect(dec.decode(zip.subarray(30, 30 + nameLen))).toBe("tasse.csv");
    // CRC nel header combacia col CRC del contenuto.
    expect(u32le(zip, 14)).toBe(crc32(enc.encode(content)));
  });

  it("conta tutte le voci nell'EOCD", () => {
    const zip = buildZip([
      { name: "a.csv", data: enc.encode("1") },
      { name: "b.csv", data: enc.encode("22") },
      { name: "c.csv", data: enc.encode("333") },
    ]);
    const eocd = zip.length - 22;
    expect(u16le(zip, eocd + 8)).toBe(3); // entries on disk
    expect(u16le(zip, eocd + 10)).toBe(3); // total entries
  });
});
