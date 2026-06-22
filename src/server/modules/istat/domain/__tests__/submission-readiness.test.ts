import { describe, expect, it } from "vitest";
import { REGION_MOVEMENT, type RegionMovement } from "../../regional/routing";
import {
  computeSubmissionReadiness,
  missingFieldLabel,
  type ChannelVerdict,
  type RegionalPreparation,
} from "../submission-readiness";

const lazio = REGION_MOVEMENT.lazio as RegionMovement; // FILE, ross1000-xml
const umbria = REGION_MOVEMENT.umbria as RegionMovement; // FILE, turismatica-c59
const campania = REGION_MOVEMENT.campania as RegionMovement; // ASSISTITO, serializer null

const stub: ChannelVerdict = { isImplemented: false };
const operational: ChannelVerdict = { isImplemented: true };
const ok: RegionalPreparation = { kind: "OK" };

describe("computeSubmissionReadiness", () => {
  it("UNROUTED quando la regione è null (provincia non riconosciuta)", () => {
    const r = computeSubmissionReadiness(null, null, null);
    expect(r.status).toBe("UNROUTED");
    expect(r.region).toBeNull();
    expect(r.serializerId).toBeNull();
    expect(r.canAutoSubmit).toBe(false);
    expect(r.missingFields).toEqual([]);
  });

  it("ASSISTED quando la regione non ha serializer integrato", () => {
    const r = computeSubmissionReadiness(campania, null, null);
    expect(r.status).toBe("ASSISTED");
    expect(r.region).toBe(campania);
    expect(r.serializerId).toBeNull();
    expect(r.canAutoSubmit).toBe(false);
  });

  it("READY quando il tracciato è completo (FILE + OK)", () => {
    const r = computeSubmissionReadiness(lazio, ok, stub);
    expect(r.status).toBe("READY");
    expect(r.serializerId).toBe("ross1000-xml");
    expect(r.missingFields).toEqual([]);
  });

  it("INCOMPLETE elenca i campi mancanti, etichettati e deduplicati", () => {
    const prep: RegionalPreparation = {
      kind: "INCOMPLETE",
      missing: [
        { field: "cittadinanza", scope: "GUEST", refId: "g1" },
        { field: "cittadinanza", scope: "GUEST", refId: "g2" }, // duplicato → collassa
        { field: "tipoturismo", scope: "GUEST", refId: "g1" },
        { field: "codice", scope: "STRUTTURA" },
      ],
    };
    const r = computeSubmissionReadiness(lazio, prep, stub);
    expect(r.status).toBe("INCOMPLETE");
    expect(r.canAutoSubmit).toBe(false);
    expect(r.missingFields).toEqual(["cittadinanza ospite", "tipo turismo", "codice struttura"]);
  });

  it("canAutoSubmit resta FALSE con canale stub anche se READY (guardrail #1)", () => {
    const r = computeSubmissionReadiness(lazio, ok, stub);
    expect(r.status).toBe("READY");
    expect(r.channelImplemented).toBe(false);
    expect(r.canAutoSubmit).toBe(false);
  });

  it("canAutoSubmit diventa TRUE solo con canale operativo E tracciato completo", () => {
    expect(computeSubmissionReadiness(lazio, ok, operational).canAutoSubmit).toBe(true);
    // ma se INCOMPLETE, niente AUTO neanche con canale operativo
    const incomplete: RegionalPreparation = { kind: "INCOMPLETE", missing: [{ field: "codice" }] };
    expect(computeSubmissionReadiness(lazio, incomplete, operational).canAutoSubmit).toBe(false);
  });

  it("regione FILE diversa dal Ross1000 mantiene il proprio serializer", () => {
    const r = computeSubmissionReadiness(umbria, ok, stub);
    expect(r.status).toBe("READY");
    expect(r.serializerId).toBe("turismatica-c59");
  });
});

describe("missingFieldLabel", () => {
  it("mappa i campi noti del tracciato a etichette leggibili", () => {
    expect(missingFieldLabel("luogoresidenza")).toBe("luogo di residenza ospite");
    expect(missingFieldLabel("mezzotrasporto")).toBe("mezzo di trasporto");
    expect(missingFieldLabel("leaderId")).toBe("capogruppo");
  });

  it("ricade sul codice grezzo per un campo sconosciuto", () => {
    expect(missingFieldLabel("campo_ignoto")).toBe("campo_ignoto");
  });
});
