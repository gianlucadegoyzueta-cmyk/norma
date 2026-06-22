// Transport HTTP reale per il client PMS Sicilia (usa fetch globale). Si usa SOLO quando la trasmissione
// è esplicitamente attivata (vedi transmit.ts: tripla barriera). Nei test si usa un transport fake.

import type { HttpRequest, HttpResponse, HttpTransport } from "./pms-client";

export class FetchHttpTransport implements HttpTransport {
  constructor(private readonly timeoutMs: number = 30_000) {}

  async send(req: HttpRequest): Promise<HttpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body,
        signal: controller.signal,
      });
      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });
      const body = await res.text();
      return { status: res.status, headers, body };
    } finally {
      clearTimeout(timer);
    }
  }
}
