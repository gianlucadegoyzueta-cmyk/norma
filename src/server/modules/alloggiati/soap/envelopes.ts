// Costruzione delle richieste SOAP 1.1 per il web service Alloggiati. PURO (stringhe → stringhe).
//
// Dal WSDL (verificato): targetNamespace "AlloggiatiService"; soapAction "AlloggiatiService/<Metodo>".
// Implementiamo SOAP 1.1 (header SOAPAction + Content-Type text/xml). Il servizio espone anche
// SOAP 1.2 (ServiceSoap12) se in futuro servisse.

const SOAP_ENV_NS = "http://schemas.xmlsoap.org/soap/envelope/";
const SERVICE_NS = "AlloggiatiService";

/** Escape dei caratteri speciali XML nei valori dinamici (password, wskey, token, righe). */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function envelope(innerBody: string): string {
  return (
    '<?xml version="1.0" encoding="utf-8"?>' +
    `<soap:Envelope xmlns:soap="${SOAP_ENV_NS}"><soap:Body>${innerBody}</soap:Body></soap:Envelope>`
  );
}

export function buildGenerateTokenEnvelope(utente: string, password: string, wsKey: string): string {
  return envelope(
    `<GenerateToken xmlns="${SERVICE_NS}">` +
      `<Utente>${escapeXml(utente)}</Utente>` +
      `<Password>${escapeXml(password)}</Password>` +
      `<WsKey>${escapeXml(wsKey)}</WsKey>` +
      "</GenerateToken>",
  );
}

export function buildAuthenticationTestEnvelope(utente: string, token: string): string {
  return envelope(
    `<Authentication_Test xmlns="${SERVICE_NS}">` +
      `<Utente>${escapeXml(utente)}</Utente>` +
      `<token>${escapeXml(token)}</token>` +
      "</Authentication_Test>",
  );
}

// Test e Send hanno la STESSA identica struttura di richiesta (cambia solo il nome
// dell'elemento): un helper unico evita la duplicazione e tiene allineati i due envelope.
function buildSchedineEnvelope(
  method: "Test" | "Send",
  utente: string,
  token: string,
  righe: readonly string[],
): string {
  const elenco = righe.map((riga) => `<string>${escapeXml(riga)}</string>`).join("");
  return envelope(
    `<${method} xmlns="${SERVICE_NS}">` +
      `<Utente>${escapeXml(utente)}</Utente>` +
      `<token>${escapeXml(token)}</token>` +
      `<ElencoSchedine>${elenco}</ElencoSchedine>` +
      `</${method}>`,
  );
}

/** Richiesta `Test`: VALIDA le schedine senza acquisirle. */
export function buildTestEnvelope(utente: string, token: string, righe: readonly string[]): string {
  return buildSchedineEnvelope("Test", utente, token, righe);
}

/** Richiesta `Send`: ACQUISISCE davvero le schedine (operazione irreversibile). */
export function buildSendEnvelope(utente: string, token: string, righe: readonly string[]): string {
  return buildSchedineEnvelope("Send", utente, token, righe);
}

/**
 * Richiesta `Tabella`: scarica una tabella di riferimento (Comuni/Stati/Documenti/...).
 * ⚠️ [SUPPOSIZIONE] nome dei parametri (`tipo`) e forma della richiesta da verificare sul WSDL reale.
 */
export function buildTabellaEnvelope(utente: string, token: string, tipo: string): string {
  return envelope(
    `<Tabella xmlns="${SERVICE_NS}">` +
      `<Utente>${escapeXml(utente)}</Utente>` +
      `<token>${escapeXml(token)}</token>` +
      `<tipo>${escapeXml(tipo)}</tipo>` +
      "</Tabella>",
  );
}

/** Valore dell'header SOAPAction (SOAP 1.1) per un metodo. */
export function soapAction(method: string): string {
  return `${SERVICE_NS}/${method}`;
}
