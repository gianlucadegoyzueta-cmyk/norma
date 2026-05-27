import type { AlloggiatiSecret } from "../../../secrets";

/** Minimo necessario per generare un token (lo implementa AlloggiatiSoapClient). */
export interface TokenGenerator {
  generateToken(secret: AlloggiatiSecret): Promise<{ utente: string; token: string; expires: Date }>;
}

/** Fornisce i segreti (utente/password/wskey) di una credenziale, recuperandoli dal vault. */
export interface AlloggiatiCredentialProvider {
  getSecret(credentialId: string): Promise<AlloggiatiSecret>;
}

export interface TokenManagerOptions {
  /** Margine di sicurezza prima della scadenza per rigenerare (default 60s). */
  safetyMarginMs?: number;
  /** Orologio iniettabile per i test. Default Date.now. */
  now?: () => number;
}

interface CachedToken {
  utente: string;
  token: string;
  expiresMs: number;
}

const DEFAULT_SAFETY_MARGIN_MS = 60_000;

/**
 * Gestione token per credenziale:
 *  - CACHE per credenziale;
 *  - refresh LAZY: si rigenera solo vicino alla scadenza (letta da `expires`);
 *  - SINGLE-FLIGHT: una sola GenerateToken in volo per credenziale (chiamate concorrenti
 *    condividono la stessa Promise) → niente "token storm" con molti host.
 */
export class TokenManager {
  private readonly cache = new Map<string, CachedToken>();
  private readonly inflight = new Map<string, Promise<CachedToken>>();
  private readonly safetyMarginMs: number;
  private readonly now: () => number;

  constructor(
    private readonly client: TokenGenerator,
    private readonly provider: AlloggiatiCredentialProvider,
    options: TokenManagerOptions = {},
  ) {
    this.safetyMarginMs = options.safetyMarginMs ?? DEFAULT_SAFETY_MARGIN_MS;
    this.now = options.now ?? Date.now;
  }

  /** Restituisce un token valido per la credenziale (dalla cache o rigenerandolo). */
  async getToken(credentialId: string): Promise<{ utente: string; token: string }> {
    const cached = this.cache.get(credentialId);
    if (cached && this.now() < cached.expiresMs - this.safetyMarginMs) {
      return { utente: cached.utente, token: cached.token };
    }
    const refreshed = await this.refresh(credentialId);
    return { utente: refreshed.utente, token: refreshed.token };
  }

  /** Invalida la cache per una credenziale (es. dopo un errore di autenticazione). */
  invalidate(credentialId: string): void {
    this.cache.delete(credentialId);
  }

  private refresh(credentialId: string): Promise<CachedToken> {
    const existing = this.inflight.get(credentialId);
    if (existing) return existing; // single-flight: riusa la generazione già in corso
    const promise = this.doGenerate(credentialId).finally(() => this.inflight.delete(credentialId));
    this.inflight.set(credentialId, promise);
    return promise;
  }

  private async doGenerate(credentialId: string): Promise<CachedToken> {
    const secret = await this.provider.getSecret(credentialId);
    const res = await this.client.generateToken(secret);
    const cached: CachedToken = { utente: res.utente, token: res.token, expiresMs: res.expires.getTime() };
    this.cache.set(credentialId, cached);
    return cached;
  }
}
