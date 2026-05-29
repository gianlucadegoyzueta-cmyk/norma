import { beforeAll, describe, expect, it } from "vitest";
import { AlloggiatiSoapClient } from "../soap/client";
import { alloggiatiLiveBanner } from "./_live-safety";

// =====================================================================================
// ISPEZIONE LIVE read-only delle tabelle (diagnostica). Scarica il CSV grezzo via `Tabella`
// e ne MOSTRA un campione, SENZA scrivere nel DB e SENZA Send. Serve a conoscere il formato
// reale (colonne, discriminatore comune/stato) prima di scrivere/aggiustare il parser.
//
// Doppio gate: credenziali in env + RUN_TABLE_INSPECT=1. Lanciare con:
//   npm run alloggiati:inspect-tables
// =====================================================================================

const utente = process.env.ALLOGGIATI_UTENTE;
const password = process.env.ALLOGGIATI_PASSWORD;
const wskey = process.env.ALLOGGIATI_WSKEY;
const hasCreds = Boolean(utente && password && wskey);
const enabled = hasCreds && process.env.RUN_TABLE_INSPECT === "1";

function _dump(label: string, csv: string, headN: number, tailN = 0): void {
  const lines = csv.split(/\r?\n/).filter((l) => l.length > 0);
  const cols = lines[0]?.split(";").length ?? 0;
  console.log(`\n[${label}] righe=${lines.length} colonne(1ª riga)=${cols}`);
  for (const l of lines.slice(0, headN)) console.log("   " + l);
  if (tailN > 0 && lines.length > headN + tailN) {
    const mid = Math.floor(lines.length / 2);
    console.log("   …(centro)…");
    for (const l of lines.slice(mid, mid + 6)) console.log("   " + l);
    console.log("   …(fine)…");
    for (const l of lines.slice(-tailN)) console.log("   " + l);
  }
}

describe.skipIf(!enabled)(
  "Alloggiati — ISPEZIONE tabelle (LIVE, read-only, niente DB/Send)",
  () => {
    beforeAll(async () => {
      await alloggiatiLiveBanner(
        "Tabella → SCARICA e MOSTRA il CSV grezzo (nessuna scrittura, nessun Send)",
      );
    }, 15_000);

    it("mostra il formato reale di Luoghi / Tipi_Documento / Tipi_Alloggiato", async () => {
      const secret = {
        utente: utente as string,
        password: password as string,
        wskey: wskey as string,
      };
      const client = new AlloggiatiSoapClient({ timeoutMs: 120_000 }); // i Luoghi sono grandi
      const t = await client.generateToken(secret);

      // Analisi mirata di Luoghi: come si distinguono gli Stati esteri dai Comuni?
      const luoghi = await client.tabella(secret.utente, t.token, "Luoghi");
      const rows = luoghi
        .split(/\r?\n/)
        .filter((l) => l.length > 0)
        .slice(1); // salta header
      const byFirstDigit: Record<string, number> = {};
      let emptyProv = 0;
      const emptyProvSamples: string[] = [];
      for (const l of rows) {
        const c = l.split(";");
        const d = (c[0] ?? "?")[0] ?? "?";
        byFirstDigit[d] = (byFirstDigit[d] ?? 0) + 1;
        if ((c[2] ?? "").trim() === "") {
          emptyProv += 1;
          if (emptyProvSamples.length < 18) emptyProvSamples.push(l);
        }
      }
      console.log(`\n[Luoghi] righe dati=${rows.length}`);
      console.log("  1ª cifra codice → conteggio:", JSON.stringify(byFirstDigit));
      console.log(`  righe con Provincia VUOTA = ${emptyProv} (candidati Stati esteri):`);
      for (const l of emptyProvSamples) console.log("   " + l);
      console.log("  righe che contengono nomi di Stato noti:");
      for (const l of rows
        .filter((l) => /;(ITALIA|FRANCIA|GERMANIA|SVIZZERA|STATI UNITI|ALBANIA|ROMANIA);/.test(l))
        .slice(0, 12)) {
        console.log("   " + l);
      }

      expect(luoghi.length).toBeGreaterThan(0);
    }, 180_000);
  },
);
