import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryReservationImportRepository } from "../adapters/InMemoryReservationImportRepository";
import { type ICalFetcher, ICalFetchError } from "../ports";
import {
  ReservationImportService,
  ReservationsError,
} from "../services/reservation-import.service";

/** Fetcher iCal pilotabile nei test: restituisce un corpo o lancia un errore. */
class FakeFetcher implements ICalFetcher {
  body = "";
  error: Error | null = null;
  async fetch(): Promise<string> {
    if (this.error) throw this.error;
    return this.body;
  }
}

function feed(events: { uid: string; start: string; end: string; summary?: string }[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//test//EN"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTART;VALUE=DATE:${e.start}`,
      `DTEND;VALUE=DATE:${e.end}`,
      `SUMMARY:${e.summary ?? "Reserved"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

const ORG = "org_1";
const PROP = "prop_1";

describe("ReservationImportService", () => {
  let repo: InMemoryReservationImportRepository;
  let fetcher: FakeFetcher;
  let service: ReservationImportService;

  beforeEach(() => {
    repo = new InMemoryReservationImportRepository(() => new Date("2026-06-10T08:00:00Z"));
    fetcher = new FakeFetcher();
    service = new ReservationImportService(repo, fetcher);
  });

  it("aggiunge un feed deducendo la sorgente dall'URL", async () => {
    const { id } = await service.addImport(ORG, PROP, "https://www.airbnb.com/calendar/ical/1.ics");
    const imp = await repo.getById(id, ORG);
    expect(imp?.source).toBe("AIRBNB");
  });

  it("rifiuta URL non valido", async () => {
    await expect(service.addImport(ORG, PROP, "non-un-url")).rejects.toThrow(ReservationsError);
  });

  it("rifiuta lo stesso URL due volte sullo stesso immobile", async () => {
    const url = "https://www.airbnb.com/calendar/ical/1.ics";
    await service.addImport(ORG, PROP, url);
    await expect(service.addImport(ORG, PROP, url)).rejects.toThrow(ReservationsError);
  });

  it("sync: crea i soggiorni bozza dalle prenotazioni del feed", async () => {
    const { id } = await service.addImport(ORG, PROP, "https://www.airbnb.com/calendar/ical/1.ics");
    fetcher.body = feed([
      { uid: "a@air", start: "20260610", end: "20260615" },
      { uid: "b@air", start: "20260620", end: "20260622" },
      { uid: "block@air", start: "20260701", end: "20260705", summary: "Airbnb (Not available)" },
    ]);
    const res = await service.syncImport(id, ORG);
    expect(res.created).toBe(2); // il blocco "Not available" è filtrato
    expect(res.seen).toBe(2);

    const stays = await repo.listImportedStaysForProperty(PROP, ORG);
    expect(stays).toHaveLength(2);
    expect(stays[0].importStatus).toBe("DRAFT");
    expect(stays[0].importSource).toBe("AIRBNB");

    const imp = await repo.getById(id, ORG);
    expect(imp?.lastError).toBeNull();
    expect(imp?.lastSyncAt).not.toBeNull();
    expect(imp?.lastImported).toBe(2);
  });

  it("sync ripetuto è idempotente (nessun doppione)", async () => {
    const { id } = await service.addImport(ORG, PROP, "https://www.airbnb.com/calendar/ical/1.ics");
    fetcher.body = feed([{ uid: "a@air", start: "20260610", end: "20260615" }]);
    await service.syncImport(id, ORG);
    const res = await service.syncImport(id, ORG);
    expect(res.created).toBe(0);
    expect((await repo.listImportedStaysForProperty(PROP, ORG)).length).toBe(1);
  });

  it("prenotazione sparita dal feed: bozza → annullata; arricchita → segnalata", async () => {
    const { id } = await service.addImport(ORG, PROP, "https://www.airbnb.com/calendar/ical/1.ics");
    fetcher.body = feed([
      { uid: "draft@air", start: "20260610", end: "20260615" },
      { uid: "rich@air", start: "20260620", end: "20260622" },
    ]);
    await service.syncImport(id, ORG);

    const stays = await repo.listImportedStaysForProperty(PROP, ORG);
    const rich = stays.find((s) => s.icalUid === "rich@air")!;
    repo.setGuestsAdded(rich.id, 2); // l'host ha arricchito questa prenotazione

    // Il feed ora non contiene più nessuna delle due.
    fetcher.body = feed([]);
    const res = await service.syncImport(id, ORG);
    expect(res.cancelled).toBe(1);
    expect(res.flaggedForReview).toBe(1);

    const after = await repo.listImportedStaysForProperty(PROP, ORG);
    expect(after.find((s) => s.icalUid === "draft@air")?.importStatus).toBe("CANCELLED");
    expect(after.find((s) => s.icalUid === "rich@air")?.importStatus).toBe("NEEDS_CANCEL_REVIEW");
  });

  it("errore di fetch: registra lastError e rilancia ReservationsError", async () => {
    const { id } = await service.addImport(ORG, PROP, "https://www.airbnb.com/calendar/ical/1.ics");
    fetcher.error = new ICalFetchError(
      "Il calendario non ha risposto entro 10s. Riprova più tardi.",
    );
    await expect(service.syncImport(id, ORG)).rejects.toThrow(ReservationsError);
    const imp = await repo.getById(id, ORG);
    expect(imp?.lastError).toContain("non ha risposto");
  });

  it("rimuove un feed (isolamento per organizzazione)", async () => {
    const { id } = await service.addImport(ORG, PROP, "https://www.airbnb.com/calendar/ical/1.ics");
    await service.removeImport(id, "org_altro"); // org diversa: non deve cancellare
    expect(await repo.getById(id, ORG)).not.toBeNull();
    await service.removeImport(id, ORG);
    expect(await repo.getById(id, ORG)).toBeNull();
  });

  it("syncImport rifiuta un feed di un'altra organizzazione", async () => {
    const { id } = await service.addImport(ORG, PROP, "https://www.airbnb.com/calendar/ical/1.ics");
    await expect(service.syncImport(id, "org_altro")).rejects.toThrow(ReservationsError);
  });

  it("previewImport: elenca le prenotazioni (ordinate per arrivo) e ignora i blocchi", async () => {
    fetcher.body = feed([
      { uid: "b@air", start: "20260620", end: "20260622" },
      { uid: "a@air", start: "20260610", end: "20260615" },
      { uid: "block@air", start: "20260701", end: "20260705", summary: "Airbnb (Not available)" },
    ]);
    const res = await service.previewImport("https://www.airbnb.com/calendar/ical/1.ics");
    expect(res.total).toBe(2);
    expect(res.blocked).toBe(1);
    expect(res.source).toBe("AIRBNB");
    expect(res.reservations.map((r) => r.uid)).toEqual(["a@air", "b@air"]);
    expect(res.reservations[0].nights).toBe(5);
  });

  it("previewImport: non scrive nulla a DB (nessun feed creato)", async () => {
    fetcher.body = feed([{ uid: "a@air", start: "20260610", end: "20260615" }]);
    await service.previewImport("https://www.airbnb.com/calendar/ical/1.ics");
    expect(await repo.listByProperty(PROP, ORG)).toHaveLength(0);
  });

  it("previewImport: URL non valido → ReservationsError", async () => {
    await expect(service.previewImport("non-un-url")).rejects.toThrow(ReservationsError);
  });

  it("previewImport: errore di rete → ReservationsError", async () => {
    fetcher.error = new ICalFetchError(
      "Il calendario non ha risposto entro 10s. Riprova più tardi.",
    );
    await expect(
      service.previewImport("https://www.airbnb.com/calendar/ical/1.ics"),
    ).rejects.toThrow(ReservationsError);
  });

  it("previewImport: calendario con soli blocchi → total 0, blocked > 0", async () => {
    fetcher.body = feed([
      { uid: "block@air", start: "20260701", end: "20260705", summary: "Not available" },
    ]);
    const res = await service.previewImport("https://www.airbnb.com/calendar/ical/1.ics");
    expect(res.total).toBe(0);
    expect(res.blocked).toBe(1);
  });

  it("importNow: collega il feed e lo sincronizza in un solo gesto", async () => {
    fetcher.body = feed([
      { uid: "a@air", start: "20260610", end: "20260615" },
      { uid: "b@air", start: "20260620", end: "20260622" },
    ]);
    const res = await service.importNow(ORG, PROP, "https://www.airbnb.com/calendar/ical/1.ics");
    expect(res.created).toBe(2);
    expect(res.importId).toBeTruthy();
    expect(await repo.listImportedStaysForProperty(PROP, ORG)).toHaveLength(2);
    const imp = await repo.getById(res.importId, ORG);
    expect(imp?.lastImported).toBe(2);
  });

  it("importNow: URL duplicato → ReservationsError", async () => {
    const url = "https://www.airbnb.com/calendar/ical/1.ics";
    fetcher.body = feed([{ uid: "a@air", start: "20260610", end: "20260615" }]);
    await service.importNow(ORG, PROP, url);
    await expect(service.importNow(ORG, PROP, url)).rejects.toThrow(ReservationsError);
  });
});
