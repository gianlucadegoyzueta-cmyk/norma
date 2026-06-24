// Bozza offline del check-in: salva i campi compilati in localStorage (per token) così una
// disconnessione o un refresh non perde i dati; si ripristina al rientro e si cancella al submit.
// Le ComboBox (comune/luogo) NON sono ripristinate: il loro stato interno non si riapplica in
// modo affidabile → restano da ri-selezionare. `token`/`lang` non si persistono.

export const DRAFT_COMBO_FIELDS = new Set([
  "birthComuneId",
  "documentPlaceId",
  "residenceComuneId",
]);

const draftKey = (token: string) => `norma:checkin-draft:${token}`;

/** Serializza i campi non vuoti del form (escludendo token/lang) in localStorage. */
export function saveDraft(token: string, form: HTMLFormElement): void {
  try {
    const obj: Record<string, string> = {};
    for (const [k, v] of new FormData(form).entries()) {
      if (k === "token" || k === "lang") continue;
      if (typeof v === "string" && v) obj[k] = v;
    }
    if (Object.keys(obj).length) localStorage.setItem(draftKey(token), JSON.stringify(obj));
    else localStorage.removeItem(draftKey(token));
  } catch {
    /* storage non disponibile/navigazione privata: la bozza è un extra, si ignora */
  }
}

export function loadDraft(token: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(draftKey(token));
    if (!raw) return null;
    const d: unknown = JSON.parse(raw);
    return d && typeof d === "object" ? (d as Record<string, string>) : null;
  } catch {
    return null;
  }
}

export function clearDraft(token: string): void {
  try {
    localStorage.removeItem(draftKey(token));
  } catch {
    /* ignora */
  }
}
