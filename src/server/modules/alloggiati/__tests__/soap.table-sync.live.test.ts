import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaReferenceTableRepository } from "../adapters/PrismaReferenceTableRepository";
import { SoapTabellaClient } from "../adapters/SoapTabellaClient";
import { checkReferenceTablesHealth } from "../services/reference-health";
import { TableSyncService } from "../services/table-sync.service";
import { AlloggiatiSoapClient } from "../soap/client";
import { TokenManager } from "../soap/token-manager";
import { alloggiatiLiveBanner } from "./_live-safety";

// =====================================================================================
// SINCRONIZZAZIONE TABELLE LIVE (FASE C dell'onboarding). Fa SOLO una cosa: scarica dal
// metodo `Tabella` del web service i CSV ufficiali (Comuni, Stati, Tipi Documento, Tipi
// Alloggiato) e POPOLA Comune/Country/DocumentType nel database. NON chiama mai Send.
//
// DOPPIO GATE: credenziali in env + flag esplicito RUN_TABLE_SYNC=1. Lanciare con (legge
// credenziali e DB dal .env):
//   npm run alloggiati:sync-tables
//
// ⚠️ Scrive nel DB reale (upsert idempotente: rieseguire è sicuro). Usa la connessione
// diretta/session (DIRECT_URL), come gli altri test che toccano il DB.
// =====================================================================================

const utente = process.env.ALLOGGIATI_UTENTE;
const password = process.env.ALLOGGIATI_PASSWORD;
const wskey = process.env.ALLOGGIATI_WSKEY;
const hasCreds = Boolean(utente && password && wskey);
const enabled = hasCreds && process.env.RUN_TABLE_SYNC === "1";

describe.skipIf(!enabled)("Alloggiati — sincronizzazione tabelle di riferimento (LIVE)", () => {
  let prisma: PrismaClient;

  beforeAll(async () => {
    await alloggiatiLiveBanner("Tabella → POPOLA Comune/Country/DocumentType nel DB (NESSUN Send)");
    const { PrismaClient } = await import("@prisma/client");
    const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    prisma = new PrismaClient({ datasourceUrl: url });
  }, 30_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("scarica le 4 tabelle dal Web Service e fa l'upsert idempotente nel DB", async () => {
    const secret = {
      utente: utente as string,
      password: password as string,
      wskey: wskey as string,
    };
    const client = new AlloggiatiSoapClient({ timeoutMs: 120_000 }); // Luoghi è grande (~11k righe)
    // TokenManager con provider inline: per uno script one-off il credentialId è irrilevante,
    // restituiamo sempre il segreto preso dalle env.
    const tokens = new TokenManager(client, { getSecret: async () => secret });
    const tabellaClient = new SoapTabellaClient(tokens, client, "live");
    const repo = new PrismaReferenceTableRepository(prisma);

    const before = await checkReferenceTablesHealth(repo);
    console.log(`[Prima]  ready=${before.ready} counts=${JSON.stringify(before.counts)}`);

    const report = await new TableSyncService(tabellaClient, repo).syncAll();
    console.log(
      `[Sync]   nuovi → comuni=${report.comuni} stati=${report.countries} ` +
        `documenti=${report.documentTypes} (tipiAlloggiato verificati=${report.tipiAlloggiatoChecked})`,
    );

    const after = await checkReferenceTablesHealth(repo);
    console.log(`[Dopo]   ready=${after.ready} counts=${JSON.stringify(after.counts)}`);
    console.log(`[Esito]  ${after.message}`);

    expect(after.ready).toBe(true);
    expect(after.counts.comuni).toBeGreaterThan(0);
    expect(after.counts.countries).toBeGreaterThan(0);
    expect(after.counts.documentTypes).toBeGreaterThan(0);
  }, 300_000); // i Comuni sono migliaia: ampio margine per download + insert
});
