/**
 * Condivisione file nativa (app mobile). In una webview il download "classico" via
 * `<a download>` non apre nulla; qui scriviamo il file nella cache e apriamo il foglio di
 * condivisione di sistema ("Salva su File", AirDrop, Mail, WhatsApp…). Su web ritorna `false`
 * e il chiamante ricade sul download del browser.
 *
 * Import dinamici + fail-open: un errore non deve mai bloccare l'export (resta il download).
 */
import { isNative } from "./index";

/** UTF-8-safe → base64 (btoa da solo rompe su accenti/caratteri non Latin1). */
export function toBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * Condivide un file (contenuto base64) tramite il foglio di sistema. Ritorna `true` se la
 * condivisione è partita, `false` su web o in caso di errore (→ il chiamante fa il download).
 */
export async function shareFile(filename: string, base64: string): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const written = await Filesystem.writeFile({
      path: filename,
      data: base64,
      directory: Directory.Cache,
    });
    const { Share } = await import("@capacitor/share");
    await Share.share({ title: filename, files: [written.uri] });
    return true;
  } catch {
    return false;
  }
}
