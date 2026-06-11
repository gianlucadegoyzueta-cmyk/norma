// Encoder ZIP "store" (nessuna compressione), senza dipendenze esterne. PURO e deterministico:
// stessi file in → stessi byte out (timestamp DOS fisso). Serve all'export "I tuoi dati" per
// impacchettare più CSV in un unico file scaricabile, evitando download multipli bloccati dal browser.
// Formato: APPNOTE.TXT (PKWARE) — local file header + central directory + EOCD, little-endian.

export interface ZipEntry {
  /** Nome file dentro l'archivio (ASCII, es. "soggiorni.csv"). */
  name: string;
  data: Uint8Array;
}

// Tabella CRC-32 (polinomio IEEE 0xEDB88320), calcolata una volta.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 di una sequenza di byte (>>> 0 per restare unsigned 32-bit). */
export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Data/ora DOS fissa (2026-01-01 00:00) per output deterministico/testabile.
const DOS_TIME = 0;
const DOS_DATE = (((2026 - 1980) & 0x7f) << 9) | (1 << 5) | 1;

function pushU16(out: number[], v: number): void {
  out.push(v & 0xff, (v >>> 8) & 0xff);
}

function pushU32(out: number[], v: number): void {
  out.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
}

function pushBytes(out: number[], bytes: Uint8Array): void {
  for (let i = 0; i < bytes.length; i++) out.push(bytes[i]);
}

/** Costruisce un archivio ZIP "store" dai file dati. Ritorna i byte dell'archivio. */
export function buildZip(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const local: number[] = [];
  const central: number[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    // --- Local file header ---
    const localStart = offset;
    pushU32(local, 0x04034b50); // signature
    pushU16(local, 20); // version needed
    pushU16(local, 0); // flags
    pushU16(local, 0); // method 0 = store
    pushU16(local, DOS_TIME);
    pushU16(local, DOS_DATE);
    pushU32(local, crc);
    pushU32(local, size); // compressed size (= size, store)
    pushU32(local, size); // uncompressed size
    pushU16(local, nameBytes.length);
    pushU16(local, 0); // extra field length
    pushBytes(local, nameBytes);
    pushBytes(local, entry.data);
    offset += 30 + nameBytes.length + size;

    // --- Central directory header (accumulato, scritto dopo i local) ---
    pushU32(central, 0x02014b50); // signature
    pushU16(central, 20); // version made by
    pushU16(central, 20); // version needed
    pushU16(central, 0); // flags
    pushU16(central, 0); // method
    pushU16(central, DOS_TIME);
    pushU16(central, DOS_DATE);
    pushU32(central, crc);
    pushU32(central, size);
    pushU32(central, size);
    pushU16(central, nameBytes.length);
    pushU16(central, 0); // extra
    pushU16(central, 0); // comment
    pushU16(central, 0); // disk number start
    pushU16(central, 0); // internal attrs
    pushU32(central, 0); // external attrs
    pushU32(central, localStart); // offset of local header
    pushBytes(central, nameBytes);
  }

  const centralOffset = offset;
  const centralSize = central.length;

  // --- End of central directory ---
  const eocd: number[] = [];
  pushU32(eocd, 0x06054b50); // signature
  pushU16(eocd, 0); // disk number
  pushU16(eocd, 0); // disk with central dir
  pushU16(eocd, entries.length); // entries on this disk
  pushU16(eocd, entries.length); // total entries
  pushU32(eocd, centralSize);
  pushU32(eocd, centralOffset);
  pushU16(eocd, 0); // comment length

  return Uint8Array.from([...local, ...central, ...eocd]);
}
