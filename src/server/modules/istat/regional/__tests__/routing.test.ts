import { describe, expect, it } from "vitest";
import { PROVINCIA_TO_REGIONE, REGION_MOVEMENT, regionMovementForProvincia } from "../routing";

describe("routing regionale movimento turistico", () => {
  it("ogni provincia mappa a una regione presente in REGION_MOVEMENT", () => {
    for (const [sigla, regionId] of Object.entries(PROVINCIA_TO_REGIONE)) {
      expect(REGION_MOVEMENT[regionId], `${sigla} → ${regionId}`).toBeDefined();
    }
  });

  it("copre tutte le 107 province italiane (BZ/TN separate)", () => {
    expect(Object.keys(PROVINCIA_TO_REGIONE)).toHaveLength(107);
  });

  it("REGION_MOVEMENT ha 21 entry (19 regioni + 2 province autonome) e ogni regionId è coerente", () => {
    expect(Object.keys(REGION_MOVEMENT)).toHaveLength(21);
    for (const [key, rm] of Object.entries(REGION_MOVEMENT)) {
      expect(rm.regionId).toBe(key);
      // FILE ⇔ esiste un serializer; ASSISTITO ⇔ nessun serializer.
      if (rm.status === "FILE") expect(rm.serializerId).not.toBeNull();
      if (rm.status === "ASSISTITO") expect(rm.serializerId).toBeNull();
    }
  });

  it("14 FILE (13 Ross1000 + 1 SPOT) e 7 ASSISTITO, nessuna AUTO ancora", () => {
    const all = Object.values(REGION_MOVEMENT);
    expect(all.filter((r) => r.status === "FILE")).toHaveLength(14);
    expect(all.filter((r) => r.status === "ASSISTITO")).toHaveLength(7);
    expect(all.filter((r) => r.status === "AUTO")).toHaveLength(0);
    expect(all.filter((r) => r.serializerId === "ross1000-xml")).toHaveLength(13);
    expect(all.filter((r) => r.serializerId === "spot-xml")).toHaveLength(1);
  });

  it("spot-check di routing per sigla", () => {
    expect(regionMovementForProvincia("RM")?.regionId).toBe("lazio");
    expect(regionMovementForProvincia("RM")?.status).toBe("FILE");
    expect(regionMovementForProvincia("RM")?.serializerId).toBe("ross1000-xml");
    expect(regionMovementForProvincia("MI")?.regionId).toBe("lombardia");
    expect(regionMovementForProvincia("BA")?.regionId).toBe("puglia");
    expect(regionMovementForProvincia("BA")?.status).toBe("FILE");
    expect(regionMovementForProvincia("BA")?.serializerId).toBe("spot-xml");
    expect(regionMovementForProvincia("NA")?.status).toBe("ASSISTITO");
    expect(regionMovementForProvincia("BZ")?.regionId).toBe("bolzano");
    expect(regionMovementForProvincia("TN")?.regionId).toBe("trento");
    expect(regionMovementForProvincia("AO")?.regionId).toBe("valle-aosta");
  });

  it("case-insensitive; sigla sconosciuta o assente → null", () => {
    expect(regionMovementForProvincia("rm")?.regionId).toBe("lazio");
    expect(regionMovementForProvincia("XX")).toBeNull();
    expect(regionMovementForProvincia(null)).toBeNull();
    expect(regionMovementForProvincia(undefined)).toBeNull();
  });
});
