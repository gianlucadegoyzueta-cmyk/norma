import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { AlloggiatiSoapClient } from "../soap/client";
import { analyzeReceiptPdfBuffer } from "../diagnostics/gate0-pdf";
import { alloggiatiLiveBanner } from "./_live-safety";

// =====================================================================================
// GATE #0 — Diagnostico PDF Ricevuta (LIVE).
// Scarica la Ricevuta di uno o più giorni PASSATI (con acquisizioni note) e analizza il PDF
// restituito: magic bytes, dimensione, snippet testuali grezzi. NON chiama Send.
//
// Prerequisito: credenziali valide + almeno un giorno con schedine già acquisite sul portale.
// Doppio gate: credenziali in env + RUN_GATE0_PDF=1 →  npm run alloggiati:gate0-pdf
//
// Output artefatti (gitignored): tmp/gate0-ricevuta/ricevuta-YYYY-MM-DD.pdf + report JSON.
// =====================================================================================

const utente = process.env.ALLOGGIATI_UTENTE;
const password = process.env.ALLOGGIATI_PASSWORD;
const wskey = process.env.ALLOGGIATI_WSKEY;
const hasCreds = Boolean(utente && password && wskey);
const enabled = hasCreds && process.env.RUN_GATE0_PDF === "1";

/** Data in fuso Europe/Rome come "YYYY-MM-DD". */
function romeDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

const OUT_DIR = join(process.cwd(), "tmp/gate0-ricevuta");

describe.skipIf(!enabled)("Gate #0 — Ricevuta PDF diagnostico (LIVE, niente Send)", () => {
  beforeAll(async () => {
    await alloggiatiLiveBanner("Ricevuta: scarica PDF giorni passati (NESSUN Send)");
    mkdirSync(OUT_DIR, { recursive: true });
  }, 15_000);

  it("scarica Ricevuta, salva PDF e produce report diagnostico", async () => {
    const client = new AlloggiatiSoapClient();
    const secret = {
      utente: utente as string,
      password: password as string,
      wskey: wskey as string,
    };
    const { token, issued } = await client.generateToken(secret);
    await client.authenticationTest(secret.utente, token);

    const todayRome = romeDate(issued);
    console.log(`[Gate #0] oggi(Rome)=${todayRome} token ok`);

    // Date esplicite (virgola-separate) oppure scan automatico ieri → -30gg.
    const explicit = process.env.ALLOGGIATI_RICEVUTA_DATES?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const dates =
      explicit && explicit.length > 0
        ? explicit
        : Array.from({ length: 30 }, (_, i) => addDays(todayRome, -(i + 1)));

    type Attempt = {
      date: string;
      ok: boolean;
      error?: string;
      analysis?: ReturnType<typeof analyzeReceiptPdfBuffer>;
      pdfPath?: string;
    };
    const attempts: Attempt[] = [];
    let firstSuccess: Attempt | null = null;

    for (const date of dates) {
      try {
        const { pdfBase64 } = await client.ricevuta(secret.utente, token, date);
        const buf = Buffer.from(pdfBase64, "base64");
        const analysis = analyzeReceiptPdfBuffer(buf);
        const pdfPath = join(OUT_DIR, `ricevuta-${date}.pdf`);
        writeFileSync(pdfPath, buf);
        const reportPath = join(OUT_DIR, `ricevuta-${date}.report.json`);
        writeFileSync(reportPath, JSON.stringify({ date, analysis }, null, 2));

        const row: Attempt = { date, ok: true, analysis, pdfPath };
        attempts.push(row);
        if (!firstSuccess) firstSuccess = row;

        console.log(
          `[Ricevuta ${date}] OK size=${analysis.sizeBytes}B pdf=${analysis.isPdfMagic} snippets=${analysis.printableSnippets.length}`,
        );
        console.log(`  → salvato ${pdfPath}`);
        analysis.parserHints.forEach((h) => console.log(`  hint: ${h}`));
        if (analysis.printableSnippets.length > 0) {
          console.log(`  snippet campione: ${analysis.printableSnippets.slice(0, 5).join(" | ")}`);
        }

        // Se l'utente ha passato date esplicite, proviamo tutte; altrimenti basta la prima con PDF.
        if (!explicit) break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        attempts.push({ date, ok: false, error: msg });
        console.log(`[Ricevuta ${date}] skip: ${msg.slice(0, 120)}`);
      }
    }

    writeFileSync(join(OUT_DIR, "gate0-summary.json"), JSON.stringify({ attempts }, null, 2));
    console.log(`\n[Gate #0] summary → ${join(OUT_DIR, "gate0-summary.json")}`);

    if (!firstSuccess) {
      console.warn(
        "[Gate #0] Nessuna Ricevuta scaricata. Serve un giorno PASSATO con acquisizioni sul portale.",
      );
      console.warn(
        "  Suggerimento: ALLOGGIATI_RICEVUTA_DATES=YYYY-MM-DD npm run alloggiati:gate0-pdf",
      );
    }

    // Gate #0: passa se Ricevuta risponde ( anche con ERRORE_RECUPERO_RICEVUTA su giorni vuoti).
    expect(attempts.length).toBeGreaterThan(0);
    if (firstSuccess) {
      expect(firstSuccess.analysis?.sizeBytes).toBeGreaterThan(0);
      expect(firstSuccess.analysis?.isPdfMagic).toBe(true);
    }
  }, 120_000);
});
