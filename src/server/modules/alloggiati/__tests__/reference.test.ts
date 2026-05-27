import { describe, expect, it } from "vitest";
import { FakeTabellaClient, SAMPLE_CSV } from "../adapters/FakeTabellaClient";
import { InMemoryReferenceTableRepository } from "../adapters/InMemoryReferenceTableRepository";
import {
  ReferenceCsvError,
  parseDocumentTypesCsv,
  parseLuoghiCsv,
  parseTipiAlloggiatoCsv,
} from "../domain/reference";
import { checkReferenceTablesHealth } from "../services/reference-health";
import { TableSyncError, TableSyncService } from "../services/table-sync.service";

const HEADER_LUOGHI = "Codice;Descrizione;Provincia;DataFineVal";

describe("parser Luoghi (split Comuni / Stati esteri)", () => {
  it("splitta su Provincia=='ES': Comuni vs Stati", () => {
    const csv = [HEADER_LUOGHI, "405028001;ABANO TERME;PD;", "100000100;ITALIA;ES;", "100000215;FRANCIA;ES;"].join("\n");
    const { comuni, countries } = parseLuoghiCsv(csv, { skipHeader: true });
    expect(comuni).toEqual([{ code: "405028001", name: "ABANO TERME", provincia: "PD" }]);
    expect(countries).toEqual([
      { code: "100000100", name: "ITALIA" },
      { code: "100000215", name: "FRANCIA" },
    ]);
  });

  it("tiene i luoghi soppressi (DataFineVal valorizzata, ignorata)", () => {
    const csv = [HEADER_LUOGHI, "403015699;ABBADIA CERRETO;MI;05/03/1992 00:00:00"].join("\n");
    const { comuni } = parseLuoghiCsv(csv, { skipHeader: true });
    expect(comuni).toEqual([{ code: "403015699", name: "ABBADIA CERRETO", provincia: "MI" }]);
  });

  it("senza skipHeader l'intestazione fa fallire la validazione larghezza", () => {
    const csv = [HEADER_LUOGHI, "405028001;ABANO TERME;PD;"].join("\n");
    expect(() => parseLuoghiCsv(csv)).toThrow(ReferenceCsvError);
  });

  it("RIFIUTA un codice luogo di larghezza errata (atteso 9)", () => {
    expect(() => parseLuoghiCsv("123;ROMA;RM;")).toThrow(ReferenceCsvError);
  });

  it("RIFIUTA una provincia di larghezza errata (attesa 2)", () => {
    expect(() => parseLuoghiCsv("405028001;ROMA;ROMA;")).toThrow(ReferenceCsvError);
  });
});

describe("parser Documenti / Tipi Alloggiato", () => {
  it("Documenti: codice 5 + descrizione", () => {
    expect(parseDocumentTypesCsv("IDELE;CARTA IDENTITA' ELETTRONICA")).toEqual([
      { code: "IDELE", name: "CARTA IDENTITA' ELETTRONICA" },
    ]);
  });

  it("Documenti: codice di larghezza errata → errore", () => {
    expect(() => parseDocumentTypesCsv("ID;CARTA")).toThrow(ReferenceCsvError);
  });

  it("Tipi Alloggiato: codice 2", () => {
    expect(parseTipiAlloggiatoCsv("16;OSPITE SINGOLO").map((r) => r.code)).toEqual(["16"]);
  });
});

describe("TableSyncService", () => {
  it("sincronizza Luoghi (split) + Documenti dal client (Fake) al repository", async () => {
    const repo = new InMemoryReferenceTableRepository();
    const report = await new TableSyncService(new FakeTabellaClient(), repo).syncAll();

    // SAMPLE: 3 comuni (ABANO/ROMA/MILANO) + 2 stati (ITALIA/FRANCIA) + 3 documenti + 5 tipi alloggiato.
    expect(report.comuni).toBe(3);
    expect(report.countries).toBe(2);
    expect(report.documentTypes).toBe(3);
    expect(report.tipiAlloggiatoChecked).toBe(5);
    expect(await repo.counts()).toEqual({ comuni: 3, countries: 2, documentTypes: 3 });
  });

  it("è IDEMPOTENTE: rieseguire la sync non cambia lo stato", async () => {
    const repo = new InMemoryReferenceTableRepository();
    const service = new TableSyncService(new FakeTabellaClient(), repo);
    await service.syncAll();
    await service.syncAll();
    expect(await repo.counts()).toEqual({ comuni: 3, countries: 2, documentTypes: 3 });
  });

  it("CSV malformato → errore chiaro e NIENTE persistito", async () => {
    const repo = new InMemoryReferenceTableRepository();
    const client = new FakeTabellaClient({ LUOGHI: `${HEADER_LUOGHI}\n123;ROMA;RM;` }); // code troppo corto
    await expect(new TableSyncService(client, repo).syncAll()).rejects.toThrow(ReferenceCsvError);
    expect(await repo.counts()).toEqual({ comuni: 0, countries: 0, documentTypes: 0 });
  });

  it("Tipi Alloggiato privi di un codice atteso (19) → TableSyncError, niente upsert", async () => {
    const repo = new InMemoryReferenceTableRepository();
    const senzaFamiliare = ["Codice;Descrizione", "16;OSPITE", "17;CAPO FAM", "18;CAPO GRP", "20;MEMBRO"].join("\n");
    const client = new FakeTabellaClient({ TIPI_ALLOGGIATO: senzaFamiliare });
    await expect(new TableSyncService(client, repo).syncAll()).rejects.toThrow(TableSyncError);
    expect(await repo.counts()).toEqual({ comuni: 0, countries: 0, documentTypes: 0 });
  });

  it("il CSV di esempio del Fake copre le tre tabelle", () => {
    expect(Object.keys(SAMPLE_CSV).sort()).toEqual(["LUOGHI", "TIPI_ALLOGGIATO", "TIPI_DOCUMENTO"]);
  });
});

describe("checkReferenceTablesHealth", () => {
  it("tabelle vuote → NON pronto, messaggio esplicito", async () => {
    const repo = new InMemoryReferenceTableRepository();
    const health = await checkReferenceTablesHealth(repo);
    expect(health.ready).toBe(false);
    expect(health.message).toMatch(/vuote/);
    expect(health.message).toMatch(/TableSyncService/);
  });

  it("dopo la sync → pronto", async () => {
    const repo = new InMemoryReferenceTableRepository();
    await new TableSyncService(new FakeTabellaClient(), repo).syncAll();
    const health = await checkReferenceTablesHealth(repo);
    expect(health.ready).toBe(true);
    expect(health.counts).toEqual({ comuni: 3, countries: 2, documentTypes: 3 });
  });
});
