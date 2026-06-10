import { type ICalFetcher, ICalFetchError } from "../ports";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_BYTES = 5_000_000; // 5 MB: un calendario di prenotazioni è qualche KB; oltre = anomalo.

/**
 * Fetcher iCal su HTTP(S) con timeout e errori "parlanti". Niente dipendenze native:
 * usa la `fetch` globale (disponibile su Node 18+ e sul runtime Vercel).
 */
export class ICalHttpFetcher implements ICalFetcher {
  constructor(private readonly timeoutMs: number = DEFAULT_TIMEOUT_MS) {}

  async fetch(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await globalThis.fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: { Accept: "text/calendar, text/plain, */*" },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new ICalFetchError(
          `Il calendario non ha risposto entro ${Math.round(this.timeoutMs / 1000)}s. Riprova più tardi.`,
        );
      }
      throw new ICalFetchError("Impossibile raggiungere il calendario: controlla l'URL.");
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new ICalFetchError(
        `Il calendario ha risposto con errore HTTP ${res.status}. Verifica che l'URL sia ancora valido.`,
      );
    }

    const body = await res.text();
    if (body.length > MAX_BYTES) {
      throw new ICalFetchError("Il calendario è troppo grande per essere importato.");
    }
    if (!body.includes("BEGIN:VCALENDAR")) {
      throw new ICalFetchError(
        "L'URL non restituisce un calendario iCal valido (manca BEGIN:VCALENDAR).",
      );
    }
    return body;
  }
}
