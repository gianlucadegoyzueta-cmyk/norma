// Encoder ZIP minimale e PURO (metodo STORE, nessuna compressione) per impacchettare i file
// giornalieri del tracciato Umbria (Turismatica C/59: un .txt per giorno). Zero dipendenze: il
// portale vuole un file per giorno, qui li uniamo in un solo .zip che l'host scarica e poi carica.
//
// Formato (APPNOTE.TXT, subset STORE): per ogni file un "local file header" + dati, poi una
// "central directory" e un "end of central directory". Deterministico (data/ora DOS fisse a 0)
// così l'output è stabile e testabile.

export interface ZipEntry {
  filename: string;
  content: string;
}

const LOCAL_FILE_HEADER_SIG = 0x04034b50;
const CENTRAL_DIR_SIG = 0x02014b50;
const END_OF_CENTRAL_DIR_SIG = 0x06054b50;
const VERSION_STORE = 20; // 2.0: serve solo lo STORE

// Tabella CRC-32 (polinomio IEEE 0xEDB88320), calcolata una volta.
const CRC_TABLE: number[] = (() => {
  const table: number[] = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (IEEE) di una sequenza di byte. Esportato per i test (vettori noti). */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Helper little-endian che accodano a un array di byte.
function pushU16(out: number[], value: number): void {
  out.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushU32(out: number[], value: number): void {
  out.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function pushBytes(out: number[], bytes: Uint8Array): void {
  for (let i = 0; i < bytes.length; i++) out.push(bytes[i]);
}

/**
 * Costruisce un archivio ZIP (STORE) dai file passati. Ritorna i byte grezzi: il chiamante
 * (server action) li trasporta al client in base64 e ricostruisce il Blob `application/zip`.
 */
export function buildStoredZip(entries: readonly ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const local: number[] = [];
  const central: number[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.filename);
    const dataBytes = encoder.encode(entry.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;
    const offset = local.length; // offset del local header per la central directory

    // Local file header
    pushU32(local, LOCAL_FILE_HEADER_SIG);
    pushU16(local, VERSION_STORE); // version needed to extract
    pushU16(local, 0); // general purpose bit flag
    pushU16(local, 0); // compression method = 0 (store)
    pushU16(local, 0); // last mod file time (fisso)
    pushU16(local, 0); // last mod file date (fisso)
    pushU32(local, crc);
    pushU32(local, size); // compressed size = uncompressed (store)
    pushU32(local, size); // uncompressed size
    pushU16(local, nameBytes.length);
    pushU16(local, 0); // extra field length
    pushBytes(local, nameBytes);
    pushBytes(local, dataBytes);

    // Central directory file header
    pushU32(central, CENTRAL_DIR_SIG);
    pushU16(central, VERSION_STORE); // version made by
    pushU16(central, VERSION_STORE); // version needed to extract
    pushU16(central, 0); // general purpose bit flag
    pushU16(central, 0); // compression method
    pushU16(central, 0); // last mod time
    pushU16(central, 0); // last mod date
    pushU32(central, crc);
    pushU32(central, size);
    pushU32(central, size);
    pushU16(central, nameBytes.length);
    pushU16(central, 0); // extra field length
    pushU16(central, 0); // file comment length
    pushU16(central, 0); // disk number start
    pushU16(central, 0); // internal file attributes
    pushU32(central, 0); // external file attributes
    pushU32(central, offset); // relative offset of local header
    pushBytes(central, nameBytes);
  }

  // End of central directory record
  const eocd: number[] = [];
  pushU32(eocd, END_OF_CENTRAL_DIR_SIG);
  pushU16(eocd, 0); // numero di questo disco
  pushU16(eocd, 0); // disco con l'inizio della central directory
  pushU16(eocd, entries.length); // voci della central directory su questo disco
  pushU16(eocd, entries.length); // voci totali della central directory
  pushU32(eocd, central.length); // dimensione della central directory
  pushU32(eocd, local.length); // offset dell'inizio della central directory
  pushU16(eocd, 0); // lunghezza del commento

  return Uint8Array.from([...local, ...central, ...eocd]);
}
