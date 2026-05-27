import { XMLParser } from "fast-xml-parser";
import type { EsitoServizio, SoapFaultInfo } from "./errors";

// Parser configurato per ignorare gli attributi e rimuovere i prefissi di namespace
// (così `soap:Envelope` → `Envelope`). I valori restano stringhe (parseTagValue:false):
// le conversioni (esito → boolean, numeri) le facciamo noi in modo controllato.
const parser = new XMLParser({
  ignoreAttributes: true,
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});

/** Normalizza un valore di tag in stringa non vuota, oppure undefined. */
export function normalizeStr(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

/** Normalizza un nodo che fast-xml-parser può restituire come singolo o array. */
export function toArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

export interface ParsedEnvelope {
  // Contenuto di <soap:Body> (struttura dinamica del web service).
  body: Record<string, unknown>;
  fault?: SoapFaultInfo;
}

export function parseEnvelope(xml: string): ParsedEnvelope {
  let root: Record<string, unknown>;
  try {
    root = parser.parse(xml) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`Risposta non è XML valido: ${(e as Error).message}`);
  }
  const env = root.Envelope as Record<string, unknown> | undefined;
  const body = env?.Body as Record<string, unknown> | undefined;
  if (!body) {
    throw new Error("Risposta SOAP senza <Body>.");
  }
  const fault = body.Fault as Record<string, unknown> | undefined;
  if (fault) {
    const code = fault.faultcode ?? (fault.Code as Record<string, unknown> | undefined)?.Value;
    const reason = fault.faultstring ?? (fault.Reason as Record<string, unknown> | undefined)?.Text;
    return {
      body,
      fault: {
        faultcode: normalizeStr(code),
        faultstring: normalizeStr(reason),
        detail: normalizeStr(typeof fault.detail === "string" ? fault.detail : undefined),
      },
    };
  }
  return { body };
}

/** Legge un nodo EsitoOperazioneServizio (gestendo le due capitalizzazioni del manuale). */
export function readEsito(node: unknown): EsitoServizio {
  const n = (node ?? {}) as Record<string, unknown>;
  return {
    esito: normalizeStr(n.esito) === "true",
    errorCod: normalizeStr(n.ErroreCod ?? n.errorCod),
    errorDes: normalizeStr(n.ErroreDes ?? n.errorDes),
    errorDettaglio: normalizeStr(n.ErroreDettaglio ?? n.erroreDettaglio),
  };
}
