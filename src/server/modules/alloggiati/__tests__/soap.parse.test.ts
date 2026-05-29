import { describe, expect, it } from "vitest";
import { parseEnvelope, readEsito, toArray } from "../soap/parse";

const GENERATE_TOKEN_OK = `<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
 <soap:Body>
  <GenerateTokenResponse xmlns="AlloggiatiService">
   <GenerateTokenResult>
    <issued>2026-05-27T13:13:47.154+02:00</issued>
    <expires>2026-05-27T14:13:47.154+02:00</expires>
    <token>TOKEN_ABC</token>
   </GenerateTokenResult>
   <result><esito>true</esito><ErroreCod/><ErroreDes/><ErroreDettaglio/></result>
  </GenerateTokenResponse>
 </soap:Body>
</soap:Envelope>`;

const TEST_RESPONSE = `<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
 <soap:Body>
  <TestResponse xmlns="AlloggiatiService">
   <TestResult><esito>true</esito><ErroreCod/><ErroreDes/><ErroreDettaglio/></TestResult>
   <result>
    <SchedineValide>1</SchedineValide>
    <Dettaglio>
     <EsitoOperazioneServizio><esito>false</esito><ErroreCod>11</ErroreCod><ErroreDes>SCHEDINA_FORMATO_NON_CORRETTO</ErroreDes><ErroreDettaglio>Dimensione Riga errata</ErroreDettaglio></EsitoOperazioneServizio>
     <EsitoOperazioneServizio><esito>true</esito><ErroreCod/><ErroreDes/><ErroreDettaglio/></EsitoOperazioneServizio>
    </Dettaglio>
   </result>
  </TestResponse>
 </soap:Body>
</soap:Envelope>`;

const FAULT = `<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
 <soap:Body>
  <soap:Fault><faultcode>soap:Server</faultcode><faultstring>Errore interno</faultstring></soap:Fault>
 </soap:Body>
</soap:Envelope>`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRec = any;

describe("parseEnvelope", () => {
  it("estrae il body rimuovendo i prefissi di namespace", () => {
    const { body, fault } = parseEnvelope(GENERATE_TOKEN_OK);
    expect(fault).toBeUndefined();
    const resp = (body as AnyRec).GenerateTokenResponse;
    expect(resp.GenerateTokenResult.token).toBe("TOKEN_ABC");
    expect(readEsito(resp.result).esito).toBe(true);
  });

  it("rileva un SOAP Fault", () => {
    const { fault } = parseEnvelope(FAULT);
    expect(fault?.faultstring).toBe("Errore interno");
  });
});

describe("readEsito + Dettaglio (Test)", () => {
  it("legge gli esiti riga-per-riga", () => {
    const { body } = parseEnvelope(TEST_RESPONSE);
    const resp = (body as AnyRec).TestResponse;
    expect(readEsito(resp.TestResult).esito).toBe(true);
    const righe = toArray(resp.result.Dettaglio.EsitoOperazioneServizio).map(readEsito);
    expect(righe).toHaveLength(2);
    expect(righe[0]).toMatchObject({
      esito: false,
      errorCod: "11",
      errorDes: "SCHEDINA_FORMATO_NON_CORRETTO",
    });
    expect(righe[1].esito).toBe(true);
  });
});
