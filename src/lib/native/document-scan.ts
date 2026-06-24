/**
 * Scansione documento al check-in (solo app nativa). Acquisisce una foto della MRZ (la zona a
 * lettura ottica di passaporti/CIE), la passa all'OCR e ne estrae i campi ad ALTA CONFIDENZA che
 * NON richiedono una tabella di codifica (Alloggiati): cognome, nome, sesso, data di nascita,
 * numero documento. Questi pre-compilano il form; l'ospite **conferma sempre** (mai auto-submit).
 *
 * Volutamente NON deriviamo tipo documento / cittadinanza / luogo di rilascio: quelle sono select
 * con codici DB (tabelle Stati/Documenti) e la MRZ non li fornisce in modo affidabile → "mai
 * inventare". Restano da scegliere a mano.
 *
 * Il parsing è puro e testabile (parseMrz); la cattura/OCR è nativa, caricata dinamicamente e
 * fail-open (un errore non rompe il check-in, che resta compilabile a mano).
 */
import { isNative } from "./index";

export interface ScannedIdentity {
  lastName?: string;
  firstName?: string;
  sex?: "M" | "F";
  /** ISO YYYY-MM-DD, pronto per l'input type=date. */
  birthDate?: string;
  documentNumber?: string;
}

/** Una riga MRZ valida: solo A-Z, 0-9 e il filler `<`, lunghezza 30/36/44. */
const MRZ_LINE = /^[A-Z0-9<]{30,44}$/;

/** Estrae dalle righe OCR le 2-3 righe MRZ consecutive di pari lunghezza (TD1=30, TD2=36, TD3=44). */
export function extractMrzLines(ocrText: string): string[] | null {
  const candidates = ocrText
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, "").toUpperCase())
    .filter((l) => MRZ_LINE.test(l));
  if (candidates.length < 2) return null;

  // Cerca un blocco omogeneo: 3 righe da 30 (TD1) o 2 righe da 44/36 (TD3/TD2).
  for (let i = 0; i < candidates.length; i++) {
    const len = candidates[i].length;
    if (len === 30 && candidates.slice(i, i + 3).filter((l) => l.length === 30).length >= 3) {
      return candidates.slice(i, i + 3);
    }
    if (
      (len === 44 || len === 36) &&
      candidates.slice(i, i + 2).filter((l) => l.length === len).length >= 2
    ) {
      return candidates.slice(i, i + 2);
    }
  }
  return null;
}

/** Nome MRZ → testo leggibile: `<<` separa cognome/nome, `<` è spazio. */
function splitMrzName(field: string): { lastName?: string; firstName?: string } {
  const [last = "", given = ""] = field.split("<<");
  const clean = (s: string) => s.replace(/</g, " ").trim().replace(/\s+/g, " ");
  const lastName = clean(last) || undefined;
  const firstName = clean(given) || undefined;
  return { lastName, firstName };
}

/** YYMMDD (MRZ) → ISO YYYY-MM-DD. Euristica secolo per date di NASCITA: YY oltre l'anno corrente
 *  a due cifre → 1900+YY, altrimenti 2000+YY (un nato nel '05 è 2005, nel '85 è 1985). */
export function mrzBirthToIso(yymmdd: string, currentYear: number): string | undefined {
  if (!/^\d{6}$/.test(yymmdd)) return undefined;
  const yy = Number(yymmdd.slice(0, 2));
  const mm = yymmdd.slice(2, 4);
  const dd = yymmdd.slice(4, 6);
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return undefined;
  const pivot = currentYear % 100;
  const year = yy > pivot ? 1900 + yy : 2000 + yy;
  return `${year}-${mm}-${dd}`;
}

function mrzSex(c: string): "M" | "F" | undefined {
  if (c === "M") return "M";
  if (c === "F") return "F";
  return undefined;
}

/**
 * Parser MRZ puro per TD3 (passaporto, 2×44) e TD1 (carta d'identità, 3×30). Estrae solo i campi
 * sicuri. `currentYear` iniettato per testabilità (niente `new Date()` qui dentro).
 */
export function parseMrz(lines: string[], currentYear: number): ScannedIdentity | null {
  if (lines.length >= 2 && lines[0].length === 44 && lines[1].length === 44) {
    // TD3 (passaporto): riga1 = tipo+stato+nome; riga2 = nDoc(0-8), naz(10-12), nascita(13-18), sesso(20).
    const names = splitMrzName(lines[0].slice(5));
    const documentNumber = lines[1].slice(0, 9).replace(/</g, "") || undefined;
    const birthDate = mrzBirthToIso(lines[1].slice(13, 19), currentYear);
    const sex = mrzSex(lines[1][20]);
    return { ...names, documentNumber, birthDate, sex };
  }
  if (lines.length >= 3 && lines[0].length === 30 && lines[1].length === 30) {
    // TD1 (CIE): riga1 = tipo+stato+nDoc(5-13); riga2 = nascita(0-5), sesso(7); riga3 = nome.
    const documentNumber = lines[0].slice(5, 14).replace(/</g, "") || undefined;
    const birthDate = mrzBirthToIso(lines[1].slice(0, 6), currentYear);
    const sex = mrzSex(lines[1][7]);
    const names = splitMrzName(lines[2]);
    return { ...names, documentNumber, birthDate, sex };
  }
  return null;
}

/**
 * Flusso nativo completo: scatta la foto, OCR, estrae e parsa la MRZ. Ritorna null su web o su
 * qualsiasi errore (fail-open). I plugin sono importati dinamicamente: niente peso su SSR/web.
 */
export async function scanDocumentMrz(): Promise<ScannedIdentity | null> {
  if (!isNative()) return null;
  try {
    const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
    });
    if (!photo.base64String) return null;

    const { CapacitorPluginMlKitTextRecognition } =
      await import("@pantrist/capacitor-plugin-ml-kit-text-recognition");
    const { text } = await CapacitorPluginMlKitTextRecognition.detectText({
      base64Image: photo.base64String,
    });
    const lines = extractMrzLines(text);
    if (!lines) return null;

    return parseMrz(lines, new Date().getFullYear());
  } catch {
    return null;
  }
}
