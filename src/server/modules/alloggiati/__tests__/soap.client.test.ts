import { describe, expect, it } from "vitest";
import { AlloggiatiSoapClient } from "../soap/client";
import {
  AlloggiatiAuthError,
  AlloggiatiProtocolError,
  AlloggiatiReceiptError,
  AlloggiatiReceiptUnavailableError,
  AlloggiatiTransientError,
} from "../soap/errors";

function fakeFetch(xml: string, status = 200): typeof fetch {
  return (async () => new Response(xml, { status })) as unknown as typeof fetch;
}
function throwingFetch(): typeof fetch {
  return (async () => {
    throw new Error("ECONNRESET");
  }) as unknown as typeof fetch;
}

const secret = { utente: "XX1", password: "p", wskey: "k" };

const TOKEN_OK = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
 <GenerateTokenResponse xmlns="AlloggiatiService">
  <GenerateTokenResult><issued>2026-05-27T13:00:00+02:00</issued><expires>2026-05-27T14:00:00+02:00</expires><token>TOK1</token></GenerateTokenResult>
  <result><esito>true</esito></result>
 </GenerateTokenResponse></soap:Body></soap:Envelope>`;

const TOKEN_FAIL = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
 <GenerateTokenResponse xmlns="AlloggiatiService">
  <result><esito>false</esito><ErroreCod>1</ErroreCod><ErroreDes>Credenziali non valide</ErroreDes></result>
 </GenerateTokenResponse></soap:Body></soap:Envelope>`;

const TEST_OK = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
 <TestResponse xmlns="AlloggiatiService">
  <TestResult><esito>true</esito></TestResult>
  <result><SchedineValide>1</SchedineValide><Dettaglio>
   <EsitoOperazioneServizio><esito>false</esito><ErroreCod>12</ErroreCod><ErroreDes>SCHEDINA_CAMPO_NON_CORRETTO</ErroreDes></EsitoOperazioneServizio>
  </Dettaglio></result>
 </TestResponse></soap:Body></soap:Envelope>`;

const FAULT = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
 <soap:Fault><faultcode>soap:Server</faultcode><faultstring>boom</faultstring></soap:Fault></soap:Body></soap:Envelope>`;

const SEND_OK = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
 <SendResponse xmlns="AlloggiatiService">
  <SendResult><esito>true</esito></SendResult>
  <result><SchedineValide>1</SchedineValide><Dettaglio>
   <EsitoOperazioneServizio><esito>true</esito></EsitoOperazioneServizio>
   <EsitoOperazioneServizio><esito>false</esito><ErroreCod>12</ErroreCod><ErroreDes>Data di Arrivo Errata</ErroreDes></EsitoOperazioneServizio>
  </Dettaglio></result>
 </SendResponse></soap:Body></soap:Envelope>`;

describe("AlloggiatiSoapClient", () => {
  it("generateToken: successo → TokenResult con scadenza parsata", async () => {
    const c = new AlloggiatiSoapClient({ fetchImpl: fakeFetch(TOKEN_OK) });
    const r = await c.generateToken(secret);
    expect(r.token).toBe("TOK1");
    expect(r.utente).toBe("XX1");
    expect(r.expires.toISOString()).toBe("2026-05-27T12:00:00.000Z"); // 14:00+02 = 12:00Z
  });

  it("generateToken: esito false → AlloggiatiAuthError", async () => {
    const c = new AlloggiatiSoapClient({ fetchImpl: fakeFetch(TOKEN_FAIL) });
    await expect(c.generateToken(secret)).rejects.toBeInstanceOf(AlloggiatiAuthError);
  });

  it("test: gli errori di validazione sono restituiti riga-per-riga (non lanciati)", async () => {
    const c = new AlloggiatiSoapClient({ fetchImpl: fakeFetch(TEST_OK) });
    const r = await c.test("XX1", "TOK", ["riga"]);
    expect(r.overall.esito).toBe(true);
    expect(r.schedineValide).toBe(1);
    expect(r.righe[0]).toMatchObject({ esito: false, errorCod: "12" });
  });

  it("SOAP Fault (anche con HTTP 500) → AlloggiatiProtocolError", async () => {
    const c = new AlloggiatiSoapClient({ fetchImpl: fakeFetch(FAULT, 500) });
    await expect(c.test("XX1", "TOK", ["r"])).rejects.toBeInstanceOf(AlloggiatiProtocolError);
  });

  it("errore di rete → AlloggiatiTransientError", async () => {
    const c = new AlloggiatiSoapClient({ fetchImpl: throwingFetch() });
    await expect(c.generateToken(secret)).rejects.toBeInstanceOf(AlloggiatiTransientError);
  });

  it("send: mappa l'esito riga-per-riga (SendResponse/SendResult), stesso parsing di Test", async () => {
    const c = new AlloggiatiSoapClient({ fetchImpl: fakeFetch(SEND_OK) });
    const r = await c.send("XX1", "TOK", ["r1", "r2"]);
    expect(r.overall.esito).toBe(true);
    expect(r.righe).toHaveLength(2);
    expect(r.righe[0].esito).toBe(true);
    expect(r.righe[1]).toMatchObject({ esito: false, errorCod: "12" });
  });

  it("send: SOAP Fault → AlloggiatiProtocolError", async () => {
    const c = new AlloggiatiSoapClient({ fetchImpl: fakeFetch(FAULT, 500) });
    await expect(c.send("XX1", "TOK", ["r"])).rejects.toBeInstanceOf(AlloggiatiProtocolError);
  });

  it("send: errore di rete → AlloggiatiTransientError", async () => {
    const c = new AlloggiatiSoapClient({ fetchImpl: throwingFetch() });
    await expect(c.send("XX1", "TOK", ["r"])).rejects.toBeInstanceOf(AlloggiatiTransientError);
  });

  it("ricevuta: ERRORE_RECUPERO_RICEVUTA → AlloggiatiReceiptUnavailableError (non auth)", async () => {
    const xml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
 <RicevutaResponse xmlns="AlloggiatiService">
  <RicevutaResult><esito>false</esito><ErroreDes>ERRORE_RECUPERO_RICEVUTA</ErroreDes></RicevutaResult>
 </RicevutaResponse></soap:Body></soap:Envelope>`;
    const c = new AlloggiatiSoapClient({ fetchImpl: fakeFetch(xml) });
    await expect(c.ricevuta("XX1", "TOK", "2026-05-28")).rejects.toBeInstanceOf(
      AlloggiatiReceiptUnavailableError,
    );
  });

  it("ricevuta: giorno non consentito → AlloggiatiReceiptError", async () => {
    const xml = `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>
 <RicevutaResponse xmlns="AlloggiatiService">
  <RicevutaResult><esito>false</esito><ErroreCod>MOCK-RIC-01</ErroreCod></RicevutaResult>
 </RicevutaResponse></soap:Body></soap:Envelope>`;
    const c = new AlloggiatiSoapClient({ fetchImpl: fakeFetch(xml) });
    await expect(c.ricevuta("XX1", "TOK", "2026-06-01")).rejects.toBeInstanceOf(
      AlloggiatiReceiptError,
    );
  });
});
