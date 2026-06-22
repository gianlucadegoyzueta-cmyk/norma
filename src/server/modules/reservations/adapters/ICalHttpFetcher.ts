import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { type ICalFetcher, ICalFetchError } from "../ports";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_BYTES = 5_000_000; // 5 MB: un calendario di prenotazioni è qualche KB; oltre = anomalo.
const MAX_REDIRECTS = 5; // Catene di redirect più lunghe = comportamento anomalo/loop.

/** Funzione di risoluzione DNS (host → indirizzi IP). Astratta per i test. */
export type DnsResolver = (host: string) => Promise<string[]>;

/** `fetch`-like minimale, astratto per i test (default: la `fetch` globale di Node 18+/Vercel). */
export type FetchLike = (
  url: string,
  init: {
    signal: AbortSignal;
    redirect: "manual";
    headers: Record<string, string>;
  },
) => Promise<Response>;

export interface ICalHttpFetcherOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  /** Override per i test. Default: `globalThis.fetch`. */
  fetchImpl?: FetchLike;
  /** Override per i test. Default: DNS reale (tutti gli indirizzi A/AAAA dell'host). */
  resolver?: DnsResolver;
}

/**
 * Risoluzione DNS reale: ritorna TUTTI gli indirizzi (v4+v6) per non bypassare il controllo
 * scegliendo un solo record (DNS rebinding parziale).
 */
const realResolver: DnsResolver = async (host) => {
  const results = await lookup(host, { all: true });
  return results.map((r) => r.address);
};

/**
 * `true` se l'IP (v4 o v6) NON è instradabile pubblicamente: loopback, privato (RFC1918),
 * link-local, metadata cloud (169.254.169.254), CGNAT, unique-local IPv6, multicast, ecc.
 * Difesa SSRF: blocca i feed che puntano (anche via redirect/DNS) alla rete interna.
 */
export function isBlockedAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isBlockedIPv4(ip);
  if (kind === 6) return isBlockedIPv6(ip);
  return true; // non è un IP riconoscibile → blocca per prudenza.
}

function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 10) return true; // 10.0.0.0/8 privato
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (incl. metadata 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 privato
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 privato
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 riservato
  return false;
}

function isBlockedIPv6(ipRaw: string): boolean {
  const ip = ipRaw.toLowerCase().split("%")[0]; // rimuove lo zone-id (es. fe80::1%eth0)
  if (ip === "::1" || ip === "::") return true; // loopback / unspecified
  // IPv4-mapped (::ffff:127.0.0.1) e compatibili: valuta la parte v4.
  const mapped = /^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(ip);
  if (mapped) return isBlockedIPv4(mapped[1]);
  if (ip.startsWith("fe80")) return true; // link-local
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // fc00::/7 unique-local
  if (ip.startsWith("ff")) return true; // ff00::/8 multicast
  return false;
}

/**
 * Fetcher iCal su HTTP(S) INDURITO. Niente dipendenze native pesanti: usa la `fetch` globale.
 *
 * Difese applicate ad OGNI hop (richiesta iniziale e ogni redirect):
 *  - SSRF: l'host viene risolto via DNS e ogni indirizzo deve essere PUBBLICO (no loopback,
 *    privato, link-local, metadata cloud, …). Un IP letterale privato è bloccato senza DNS.
 *  - MITM (C1): un redirect da https→http è rifiutato (no downgrade di trasporto).
 *  - redirect seguiti MANUALMENTE, con tetto (`maxRedirects`): niente loop, niente bypass.
 *  - timeout esplicito condiviso su tutta la catena.
 *  - cap di dimensione in STREAMING (`maxBytes`): aborta appena superato, niente OOM.
 */
export class ICalHttpFetcher implements ICalFetcher {
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly maxRedirects: number;
  private readonly fetchImpl: FetchLike;
  private readonly resolver: DnsResolver;

  // Costruttore retro-compatibile: `new ICalHttpFetcher()` o `new ICalHttpFetcher(15000)`.
  constructor(opts: number | ICalHttpFetcherOptions = {}) {
    const o: ICalHttpFetcherOptions = typeof opts === "number" ? { timeoutMs: opts } : opts;
    this.timeoutMs = o.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxBytes = o.maxBytes ?? MAX_BYTES;
    this.maxRedirects = o.maxRedirects ?? MAX_REDIRECTS;
    this.fetchImpl = o.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);
    this.resolver = o.resolver ?? realResolver;
  }

  /** Valida l'URL e blocca host non instradabili pubblicamente (SSRF). Lancia ICalFetchError. */
  private async assertSafeUrl(url: string): Promise<URL> {
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new ICalFetchError("L'indirizzo del calendario non è un URL valido.");
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new ICalFetchError("Il calendario deve usare un indirizzo http(s).");
    }
    const host = u.hostname.replace(/^\[|\]$/g, ""); // IPv6 fra parentesi quadre
    // Host già IP letterale → controllo diretto (no DNS).
    if (isIP(host)) {
      if (isBlockedAddress(host)) {
        throw new ICalFetchError("Questo indirizzo non è raggiungibile per motivi di sicurezza.");
      }
      return u;
    }
    let addresses: string[];
    try {
      addresses = await this.resolver(host);
    } catch {
      throw new ICalFetchError("Impossibile risolvere l'indirizzo del calendario.");
    }
    if (addresses.length === 0 || addresses.some((ip) => isBlockedAddress(ip))) {
      throw new ICalFetchError("Questo indirizzo non è raggiungibile per motivi di sicurezza.");
    }
    return u;
  }

  async fetch(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      let current = await this.assertSafeUrl(url);
      let wasHttps = current.protocol === "https:";

      for (let hop = 0; hop <= this.maxRedirects; hop++) {
        let res: Response;
        try {
          res = await this.fetchImpl(current.toString(), {
            signal: controller.signal,
            redirect: "manual",
            headers: { Accept: "text/calendar, text/plain, */*" },
          });
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            throw new ICalFetchError(
              `Il calendario non ha risposto entro ${Math.round(this.timeoutMs / 1000)}s. Riprova più tardi.`,
            );
          }
          throw new ICalFetchError("Impossibile raggiungere il calendario: controlla l'URL.");
        }

        // Redirect (3xx con Location): validalo e seguilo a mano.
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          if (!location) {
            throw new ICalFetchError("Il calendario ha risposto con un redirect non valido.");
          }
          let next: URL;
          try {
            next = new URL(location, current); // risolve i Location relativi
          } catch {
            throw new ICalFetchError("Il calendario ha risposto con un redirect non valido.");
          }
          // C1 — MITM: rifiuta il downgrade https→http.
          if (wasHttps && next.protocol === "http:") {
            throw new ICalFetchError(
              "Il calendario reindirizza su una connessione non sicura (http). Rifiutato.",
            );
          }
          current = await this.assertSafeUrl(next.toString());
          wasHttps = wasHttps || current.protocol === "https:";
          continue;
        }

        if (!res.ok) {
          throw new ICalFetchError(
            `Il calendario ha risposto con errore HTTP ${res.status}. Verifica che l'URL sia ancora valido.`,
          );
        }

        const body = await this.readCapped(res, controller);
        if (!body.includes("BEGIN:VCALENDAR")) {
          throw new ICalFetchError(
            "L'URL non restituisce un calendario iCal valido (manca BEGIN:VCALENDAR).",
          );
        }
        return body;
      }

      throw new ICalFetchError("Il calendario ha troppi reindirizzamenti. Verifica l'URL.");
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Legge il corpo in STREAMING fermandosi appena supera `maxBytes` (niente OOM su feed enormi
   * o su `Content-Length` mentito). Se lo stream non è disponibile, ripiega su `text()` con
   * controllo a posteriori.
   */
  private async readCapped(res: Response, controller: AbortController): Promise<string> {
    const body = res.body;
    if (!body || typeof body.getReader !== "function") {
      const text = await res.text();
      if (text.length > this.maxBytes) {
        throw new ICalFetchError("Il calendario è troppo grande per essere importato.");
      }
      return text;
    }
    const reader = body.getReader();
    const decoder = new TextDecoder("utf-8");
    let total = 0;
    let out = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          total += value.byteLength;
          if (total > this.maxBytes) {
            controller.abort(); // chiude la connessione: non scarichiamo oltre il cap.
            throw new ICalFetchError("Il calendario è troppo grande per essere importato.");
          }
          out += decoder.decode(value, { stream: true });
        }
      }
      out += decoder.decode();
      return out;
    } finally {
      reader.releaseLock?.();
    }
  }
}
