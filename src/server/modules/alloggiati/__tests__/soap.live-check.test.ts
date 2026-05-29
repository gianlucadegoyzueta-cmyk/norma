import { beforeAll, describe, expect, it } from "vitest";
import { buildTracciatoRecord } from "../domain/tracciato";
import { AlloggiatiSoapClient } from "../soap/client";
import { alloggiatiLiveBanner } from "./_live-safety";

// =====================================================================================
// VERIFICA LIVE contro il sistema REALE della Polizia di Stato (FASE B dell'onboarding).
// Esegue SOLO: GenerateToken → (probe idempotenza) → Authentication_Test → Test.
// NON chiama mai Send → NESSUNA schedina viene acquisita: è sicuro.
//
// DOPPIO GATE (sicurezza): si attiva solo se ci sono le credenziali in env E il flag esplicito
// RUN_LIVE_CHECK=1. Così un normale `npm test` NON tocca mai il sistema reale, anche dopo aver
// messo le credenziali nel .env. Per lanciarlo (legge le credenziali dal .env):
//   npm run alloggiati:live-check
//
// Scopo: verificare che le credenziali funzionano, l'idempotenza del token, e i 4 punti rimasti
// aperti del tracciato (padding giorni, maiuscole/accenti, larghezza codici, ID appartamento),
// osservando la risposta dettagliata del server e i codici di errore reali.
// =====================================================================================

const utente = process.env.ALLOGGIATI_UTENTE;
const password = process.env.ALLOGGIATI_PASSWORD;
const wskey = process.env.ALLOGGIATI_WSKEY;
const hasCreds = Boolean(utente && password && wskey);
const enabled = hasCreds && process.env.RUN_LIVE_CHECK === "1";

describe.skipIf(!enabled)("Alloggiati SOAP — verifica live (Token + Test, niente Send)", () => {
  // Banner + delay: ultima possibilità di annullare con Ctrl-C prima di toccare il sistema reale.
  beforeAll(async () => {
    await alloggiatiLiveBanner("GenerateToken + Authentication_Test + Test (NESSUN Send)");
  }, 15_000);

  const client = new AlloggiatiSoapClient();
  const secret = { utente: utente as string, password: password as string, wskey: wskey as string };

  // Schedina di ESEMPIO. ⚠️ I codici (Stato/Comune/Documento) sono placeholder: per un Test
  // "pulito" sostituiscili con codici reali delle tabelle Alloggiati. Anche con codici placeholder,
  // la risposta del server mostra ESATTAMENTE cosa accetta/rifiuta (utile per i 4 punti aperti).
  function sampleSchedina(): string {
    return buildTracciatoRecord({
      tipoAlloggiato: "OSPITE_SINGOLO",
      dataArrivo: "2026-06-01",
      giorniPermanenza: 3,
      cognome: "ROSSI",
      nome: "MARIO",
      sesso: "M",
      dataNascita: "1990-05-20",
      statoNascitaCode: "100000100",
      cittadinanzaCode: "100000100",
      comuneNascitaCode: "058091001",
      provinciaNascita: "RM",
      tipoDocumentoCode: "IDELE",
      numeroDocumento: "AB1234567",
      luogoRilascioCode: "058091001",
    });
  }

  it("GenerateToken → idempotenza → Authentication_Test → Test (report dettagliato)", async () => {
    const t1 = await client.generateToken(secret);
    console.log(
      `[GenerateToken #1] issued=${t1.issued.toISOString()} expires=${t1.expires.toISOString()} tokenLen=${t1.token.length}`,
    );
    expect(t1.token.length).toBeGreaterThan(0);

    // Idempotenza: genero un 2° token e verifico se il 1° è ancora valido.
    const t2 = await client.generateToken(secret);
    console.log(
      `[GenerateToken #2] tokenLen=${t2.token.length} ugualeAl1=${t2.token === t1.token}`,
    );
    let primoAncoraValido = true;
    try {
      await client.authenticationTest(secret.utente, t1.token);
    } catch {
      primoAncoraValido = false;
    }
    console.log(
      `[Idempotenza] dopo un 2° GenerateToken, il 1° token è ancora valido? ${primoAncoraValido}`,
    );

    await client.authenticationTest(secret.utente, t2.token);
    console.log("[Authentication_Test] token #2 valido");

    const riga = sampleSchedina();
    console.log(`[Test] lunghezza riga=${riga.length}`);
    const res = await client.test(secret.utente, t2.token, [riga]);
    console.log(
      `[Test] overall.esito=${res.overall.esito} schedineValide=${res.schedineValide} overallErr=${res.overall.errorDes ?? "-"}`,
    );
    for (const r of res.righe) {
      console.log(
        `  riga ${r.index}: esito=${r.esito} cod=${r.errorCod ?? "-"} des=${r.errorDes ?? "-"} dettaglio=${r.errorDettaglio ?? "-"}`,
      );
    }
    expect(res).toBeDefined();
  }, 60_000);
});
