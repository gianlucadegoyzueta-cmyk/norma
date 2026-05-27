import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TracciatoInput, buildTracciatoRecord } from "../domain/tracciato";
import { AlloggiatiSoapClient } from "../soap/client";
import { alloggiatiLiveBanner } from "./_live-safety";

// =====================================================================================
// FASE D — `Test` con DATI REALI (LIVE). Costruisce schedine con CODICI VERI presi dal DB
// (sincronizzato in Fase C) + un ospite FITTIZIO, e le valida con `Test`. NON chiama mai Send.
//
// Probe in un'unica chiamata Test (esiti per-riga indipendenti):
//  - 4 righe baseline UPPER a date di arrivo oggi / -1 / -2 / -3 giorni → MAPPA la finestra valida
//    della "Data di Arrivo" (le date sono ancorate all'orologio del SERVER via token.issued, in
//    fuso Europe/Rome, per non dipendere dall'orologio locale);
//  - 1 riga con ACCENTO (NICCOLÒ) e 1 minuscola alla data di oggi → accenti e maiuscole.
// Verifica empiricamente: finestra data, padding giorni, maiuscole/accenti, larghezza codici,
// mappatura errori. (L'IdAppartamento/174 char richiede una credenziale GESTIONE_APPARTAMENTI.)
//
// Doppio gate: credenziali in env + RUN_TEST_REAL=1 →  npm run alloggiati:test-real
// =====================================================================================

const utente = process.env.ALLOGGIATI_UTENTE;
const password = process.env.ALLOGGIATI_PASSWORD;
const wskey = process.env.ALLOGGIATI_WSKEY;
const hasCreds = Boolean(utente && password && wskey);
const enabled = hasCreds && process.env.RUN_TEST_REAL === "1";

/** Data in fuso Europe/Rome come "YYYY-MM-DD" (en-CA usa quel formato). */
function romeDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

describe.skipIf(!enabled)("Alloggiati — Test con DATI REALI (LIVE, niente Send)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    await alloggiatiLiveBanner("Test con codici reali dal DB (validazione, NESSUN Send)");
    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
  }, 15_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it(
    "mappa la finestra valida della Data di Arrivo + verifica codici/accenti/maiuscole",
    async () => {
      const italia = await prisma.country.findFirst({ where: { name: "ITALIA" } });
      const roma = await prisma.comune.findFirst({ where: { name: "ROMA" } });
      const doc = await prisma.documentType.findFirst({ where: { code: "IDELE" } });
      if (!italia || !roma || !doc) {
        throw new Error("Tabelle di riferimento non popolate: esegui prima la Fase C (sync).");
      }
      console.log(`[codici reali] ITALIA=${italia.code}  ROMA=${roma.code}/${roma.provincia}  DOC=${doc.code}`);

      const client = new AlloggiatiSoapClient();
      const secret = { utente: utente as string, password: password as string, wskey: wskey as string };
      const t = await client.generateToken(secret);
      console.log(`[server] issued=${t.issued.toISOString()} → oggi(Rome)=${romeDate(t.issued)}`);

      const offsets = [0, 1, 2, 3];
      const dates = offsets.map((o) => romeDate(new Date(t.issued.getTime() - o * 86_400_000)));

      const baseFields = {
        tipoAlloggiato: "OSPITE_SINGOLO",
        giorniPermanenza: 3,
        cognome: "ROSSI",
        nome: "MARIO",
        sesso: "M",
        dataNascita: "1985-03-15",
        statoNascitaCode: italia.code,
        cittadinanzaCode: italia.code,
        comuneNascitaCode: roma.code,
        provinciaNascita: roma.provincia,
        tipoDocumentoCode: doc.code,
        numeroDocumento: "AB1234567",
        luogoRilascioCode: roma.code,
      } satisfies Omit<TracciatoInput, "dataArrivo">;

      const mk = (dataArrivo: string, over: Partial<TracciatoInput> = {}): string =>
        buildTracciatoRecord({ ...baseFields, dataArrivo, ...over });

      const probes = [
        ...dates.map((d, i) => ({ label: `arrivo ${d} (oggi-${offsets[i]}gg) UPPER`, riga: mk(d) })),
        { label: `accento NICCOLÒ @${dates[0]}`, riga: mk(dates[0], { nome: "NICCOLÒ" }) },
        { label: `minuscolo rossi/mario @${dates[0]}`, riga: mk(dates[0], { cognome: "rossi", nome: "mario" }) },
      ];

      const res = await client.test(secret.utente, t.token, probes.map((p) => p.riga));
      console.log(`[Test] overall.esito=${res.overall.esito} schedineValide=${res.schedineValide}`);
      res.righe.forEach((r, i) => {
        console.log(
          `  [${probes[i].label}] esito=${r.esito} cod=${r.errorCod ?? "-"} des=${r.errorDes ?? "-"} dett=${r.errorDettaglio ?? "-"}`,
        );
      });

      expect(res.righe.length).toBe(probes.length);
    },
    60_000,
  );
});
