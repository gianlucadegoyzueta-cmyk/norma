import { describe, expect, it } from "vitest";

import { parseRicevutaSummaryText } from "../domain/ricevuta-summary";
import { AlloggiatiProtocolError } from "../soap/errors";

// Testo ANONIMIZZATO che replica fedelmente la struttura del campione reale
// scaricato dal Gate #0 (2026-03-25): stesse etichette, stesso ordine, dati finti.

/** Variante "one-line" come la estrae pdf.js/unpdf (header letter-spaced). */
const UNPDF_STYLE =
  "POLIZIA DI STATO Servizio Alloggiati R I C E V U T A D I I N V I O " +
  "LOGIN XX000000 CATEGORIA APP.TO USO TURISTICO/LOCAZIONE PURA " +
  "STRUTTURA ROSSI MARIO 01.01.1980 COMUNE ROMA (RM) " +
  "INDIRIZZO VIA ESEMPIO CIV. 1 PIANO T P.IVA/C.F. RSSMRA80A01H501X " +
  "ID. RICEVUTA 2026/000001 [RM] DATA DI INVIO 25/03/2026 SCHEDINE INVIATE 2 " +
  "GG PERMANENZA PRESUNTA TOT. 6 ALLA QUESTURA ROMA Codice di Controllo (Firma)";

/** Variante multilinea come la estrae pdftotext -layout. */
const PDFTOTEXT_STYLE = `
                              POLIZIA DI STATO
                                 Servizio Alloggiati


                              RICEVUTA DI INVIO
LOGIN                                              XX000000
CATEGORIA                              APP.TO USO TURISTICO/LOCAZIONE PURA

STRUTTURA                             ROSSI MARIO 01.01.1980
COMUNE                                            ROMA (RM)
INDIRIZZO                         VIA ESEMPIO CIV. 1 PIANO T
P.IVA/C.F.                                    RSSMRA80A01H501X
ID. RICEVUTA                                    2026/000001 [RM]
DATA DI INVIO                                      25/03/2026
SCHEDINE INVIATE                                        2
GG PERMANENZA PRESUNTA TOT.
                                                        6
ALLA QUESTURA                                          ROMA




                                                         Codice di Controllo (Firma)
`;

describe("parseRicevutaSummaryText", () => {
  it.each([
    ["unpdf one-line", UNPDF_STYLE],
    ["pdftotext multilinea", PDFTOTEXT_STYLE],
  ])("estrae tutti i campi dal formato %s", (_name, text) => {
    const summary = parseRicevutaSummaryText(text);
    expect(summary).toEqual({
      login: "XX000000",
      categoria: "APP.TO USO TURISTICO/LOCAZIONE PURA",
      struttura: "ROSSI MARIO 01.01.1980",
      comune: "ROMA (RM)",
      indirizzo: "VIA ESEMPIO CIV. 1 PIANO T",
      pivaCodiceFiscale: "RSSMRA80A01H501X",
      idRicevuta: "2026/000001 [RM]",
      dataInvio: "2026-03-25",
      schedineInviate: 2,
      ggPermanenzaTotale: 6,
      questura: "ROMA",
    });
  });

  it("rifiuta testo senza header RICEVUTA DI INVIO", () => {
    expect(() => parseRicevutaSummaryText("LOGIN XX000000 SCHEDINE INVIATE 2")).toThrow(
      AlloggiatiProtocolError,
    );
  });

  it("rifiuta ricevuta senza ID. RICEVUTA", () => {
    const text = UNPDF_STYLE.replace("ID. RICEVUTA 2026/000001 [RM] ", "");
    expect(() => parseRicevutaSummaryText(text)).toThrow(/ID\. RICEVUTA/);
  });

  it("rifiuta DATA DI INVIO malformata", () => {
    const text = UNPDF_STYLE.replace("25/03/2026", "2026-03-25");
    expect(() => parseRicevutaSummaryText(text)).toThrow(/DATA DI INVIO/);
  });

  it("rifiuta DATA DI INVIO con mese impossibile", () => {
    const text = UNPDF_STYLE.replace("25/03/2026", "25/13/2026");
    expect(() => parseRicevutaSummaryText(text)).toThrow(/DATA DI INVIO/);
  });

  it("rifiuta SCHEDINE INVIATE non numerico", () => {
    const text = UNPDF_STYLE.replace("SCHEDINE INVIATE 2 ", "SCHEDINE INVIATE DUE ");
    expect(() => parseRicevutaSummaryText(text)).toThrow(/SCHEDINE INVIATE/);
  });

  it("tollera campi opzionali assenti (GG PERMANENZA)", () => {
    const text = UNPDF_STYLE.replace("GG PERMANENZA PRESUNTA TOT. 6 ", "");
    const summary = parseRicevutaSummaryText(text);
    expect(summary.ggPermanenzaTotale).toBeNull();
    expect(summary.schedineInviate).toBe(2);
  });

  it("schedineInviate zero è valido (giorno senza invii ma con ricevuta)", () => {
    const text = UNPDF_STYLE.replace("SCHEDINE INVIATE 2", "SCHEDINE INVIATE 0");
    expect(parseRicevutaSummaryText(text).schedineInviate).toBe(0);
  });
});
