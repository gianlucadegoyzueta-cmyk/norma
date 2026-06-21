// Client della WebAPI PMS (Osservatorio Turistico Sicilia): login → addfrompms / enddayfrompms → logout.
// Il TRANSPORT HTTP è INIETTATO (HttpTransport): la logica è testabile senza rete e l'invio reale avviene
// solo con un transport che parla davvero col portale. Le credenziali sono DEL CLIENTE (account UTENTE PMS
// della singola struttura), passate al login — Norma trasmette per conto dell'host.
//
// GUARDRAIL #1: questo è solo il client. NESSUN cron/orchestrazione lo invoca in automatico finora.
// Il primo invio reale a un ente resta una decisione umana esplicita; l'attivazione (gate + flag
// per-cliente) è il passo successivo, separato.
//
// Fonte protocollo: "Protocollo di Comunicazione PMS" Rev. 1.0.7. Base URL e path case-sensitive.

import { XMLParser } from "fast-xml-parser";
import {
  buildEndDayPmsXml,
  buildStaysPmsXml,
  type SiciliaEndDay,
  type SiciliaStay,
} from "./tracciato-xml";

export const SICILIA_PMS_BASE_URL = "https://osservatorioturistico.regione.sicilia.it/webapi";

/** Credenziali del CLIENTE (singola struttura) per il portale Sicilia. */
export interface SiciliaCredentials {
  userId: string;
  password: string;
}

export interface HttpRequest {
  method: "GET" | "POST";
  url: string;
  headers: Record<string, string>;
  body?: string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

/** Astrazione del trasporto HTTP: un fake nei test, fetch reale in produzione (solo se attivato). */
export interface HttpTransport {
  send(req: HttpRequest): Promise<HttpResponse>;
}

export class SiciliaPmsError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "SiciliaPmsError";
  }
}

export interface SiciliaValidationMessage {
  level: string; // "Error" | "Warning" | "Info"
  code?: string;
  message: string;
  fieldName?: string;
  fieldValue?: string;
}

export interface SiciliaTransmitResult {
  /** true se HTTP 200 e nessun messaggio di livello Error. */
  ok: boolean;
  status: number;
  errors: SiciliaValidationMessage[];
  raw: string;
}

function headerCI(headers: Record<string, string>, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target) return v;
  }
  return undefined;
}

/** Raccoglie ricorsivamente i ValidationMessage dalla risposta (struttura annidata NestedValidation). */
function collectMessages(node: unknown, out: SiciliaValidationMessage[]): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectMessages(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  const hasMessage = "Message" in obj || "Level" in obj;
  if (hasMessage && (typeof obj.Message === "string" || typeof obj.Level === "string")) {
    out.push({
      level: String(obj.Level ?? "Info"),
      code: obj.Code != null ? String(obj.Code) : undefined,
      message: obj.Message != null ? String(obj.Message) : "",
      fieldName: obj.FieldName != null ? String(obj.FieldName) : undefined,
      fieldValue: obj.FieldValue != null ? String(obj.FieldValue) : undefined,
    });
  }
  for (const value of Object.values(obj)) collectMessages(value, out);
}

/** Estrae i messaggi di validazione (Error/Warning/Info) dal body XML di risposta. */
export function parseValidationResponse(body: string): SiciliaValidationMessage[] {
  if (!body || body.trim() === "") return [];
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
  let parsed: unknown;
  try {
    parsed = parser.parse(body);
  } catch {
    return [];
  }
  const out: SiciliaValidationMessage[] = [];
  collectMessages(parsed, out);
  return out;
}

export class SiciliaPmsClient {
  constructor(
    private readonly transport: HttpTransport,
    private readonly baseUrl: string = SICILIA_PMS_BASE_URL,
  ) {}

  /** Login con le credenziali del cliente → token Bearer. */
  async login(creds: SiciliaCredentials): Promise<string> {
    const res = await this.transport.send({
      method: "GET",
      url: `${this.baseUrl}/api/auth/login`,
      headers: { UserId: creds.userId, Password: creds.password },
    });
    if (res.status !== 200) {
      throw new SiciliaPmsError(`Login fallito (HTTP ${res.status}).`, res.status);
    }
    const fromHeader = headerCI(res.headers, "Authorization");
    const raw = fromHeader ?? res.body;
    const token = (raw ?? "").trim().replace(/^"|"$/g, "");
    if (!token) throw new SiciliaPmsError("Login: token assente nella risposta.");
    return token;
  }

  private async post(path: string, token: string, xmlBody: string): Promise<SiciliaTransmitResult> {
    const res = await this.transport.send({
      method: "POST",
      url: `${this.baseUrl}${path}`,
      // text/xml come nell'unico esempio POST normativo del protocollo (sez. 6.2); un binding
      // .NET stretto può rifiutare application/xml con 415.
      headers: { Authorization: token, "Content-Type": "text/xml" },
      body: xmlBody,
    });
    const messages = parseValidationResponse(res.body);
    const errors = messages.filter((m) => m.level.toLowerCase() === "error");
    return {
      ok: res.status === 200 && errors.length === 0,
      status: res.status,
      errors,
      raw: res.body,
    };
  }

  /** POST /api/stay/addfrompms — invia i soggiorni. */
  async addStays(token: string, stays: readonly SiciliaStay[]): Promise<SiciliaTransmitResult> {
    return this.post("/api/stay/addfrompms", token, buildStaysPmsXml(stays));
  }

  /** POST /api/entity/enddayfrompms — chiusura giornaliera (anche senza movimenti). */
  async endDay(token: string, endDay: SiciliaEndDay): Promise<SiciliaTransmitResult> {
    return this.post("/api/entity/enddayfrompms", token, buildEndDayPmsXml(endDay));
  }

  /** POST /api/auth/logout. */
  async logout(token: string, userId: string): Promise<void> {
    await this.transport.send({
      method: "POST",
      url: `${this.baseUrl}/api/auth/logout`,
      headers: { UserId: userId, Authorization: token },
    });
  }
}
