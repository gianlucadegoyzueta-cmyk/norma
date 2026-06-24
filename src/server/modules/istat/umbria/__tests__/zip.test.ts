import { describe, expect, it } from "vitest";
import { buildStoredZip, crc32 } from "../zip";

const encoder = new TextEncoder();

// Legge un intero little-endian dai byte dello ZIP.
function readU16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}
function readU32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

describe("crc32 (IEEE)", () => {
  it("vettori noti", () => {
    expect(crc32(encoder.encode(""))).toBe(0);
    // Vettore canonico CRC-32: "123456789" → 0xCBF43926.
    expect(crc32(encoder.encode("123456789"))).toBe(0xcbf43926);
    // "The quick brown fox jumps over the lazy dog" → 0x414FA339.
    expect(crc32(encoder.encode("The quick brown fox jumps over the lazy dog"))).toBe(0x414fa339);
  });
});

describe("buildStoredZip (STORE)", () => {
  it("magic dei record: local header, central directory, EOCD", () => {
    const zip = buildStoredZip([{ filename: "a.txt", content: "ciao" }]);
    // Local file header in testa.
    expect(readU32(zip, 0)).toBe(0x04034b50);
    // EOCD: ha lunghezza fissa 22 (nessun commento) → in coda.
    const eocdOffset = zip.length - 22;
    expect(readU32(zip, eocdOffset)).toBe(0x06054b50);
    // Una sola voce nella central directory.
    expect(readU16(zip, eocdOffset + 8)).toBe(1); // voci su questo disco
    expect(readU16(zip, eocdOffset + 10)).toBe(1); // voci totali
    // L'offset della central directory punta a un central dir header.
    const cdOffset = readU32(zip, eocdOffset + 16);
    expect(readU32(zip, cdOffset)).toBe(0x02014b50);
  });

  it("metodo STORE: dimensione compressa = non compressa, CRC nel header", () => {
    const content = "riga uno\r\nriga due\r\n";
    const zip = buildStoredZip([{ filename: "25062026.txt", content }]);
    const size = encoder.encode(content).length;
    // Nel local header: crc @14, compressed @18, uncompressed @22.
    expect(readU32(zip, 14)).toBe(crc32(encoder.encode(content)));
    expect(readU32(zip, 18)).toBe(size);
    expect(readU32(zip, 22)).toBe(size);
    expect(readU16(zip, 8)).toBe(0); // metodo di compressione = store
  });

  it("più file: conteggio voci e nomi nella central directory", () => {
    const entries = [
      { filename: "01062026.txt", content: "a" },
      { filename: "02062026.txt", content: "bb" },
      { filename: "03062026.txt", content: "ccc" },
    ];
    const zip = buildStoredZip(entries);
    const eocdOffset = zip.length - 22;
    expect(readU16(zip, eocdOffset + 10)).toBe(3);

    // I nomi dei file compaiono nello ZIP (filename nel local header + central dir).
    const text = Buffer.from(zip).toString("latin1");
    for (const e of entries) {
      expect(text).toContain(e.filename);
    }
  });

  it("archivio vuoto: solo EOCD con zero voci", () => {
    const zip = buildStoredZip([]);
    expect(zip.length).toBe(22);
    expect(readU32(zip, 0)).toBe(0x06054b50);
    expect(readU16(zip, 8)).toBe(0);
    expect(readU16(zip, 10)).toBe(0);
  });
});
