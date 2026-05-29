import { SchedinaStatus } from "@prisma/client";
import { beforeEach, describe, expect, it } from "vitest";
import { type ReferenceTables, createReferenceTables } from "../../alloggiati";
import { InMemorySchedinaRepository } from "../../alloggiati/adapters/InMemorySchedinaRepository";
import { InMemoryStaysRepository } from "../adapters/InMemoryStaysRepository";
import type { GuestData, Party } from "../domain/parties";
import type { ReferenceTablesLoader } from "../ports";
import { StaysError, StaysService } from "../services/stays.service";

const refs: ReferenceTables = createReferenceTables({
  comuni: [{ id: "com_roma", code: "058091001", provincia: "RM" }],
  countries: [{ id: "ctry_italia", code: "100000100" }],
  documentTypes: [{ id: "doc_idele", code: "IDELE" }],
});
const referenceLoader: ReferenceTablesLoader = { loadForGuests: async () => refs };

function persona(over: Partial<GuestData> = {}): GuestData {
  return {
    firstName: "Mario",
    lastName: "Rossi",
    sex: "M",
    birthDate: new Date("1990-05-20T00:00:00.000Z"),
    birthCountryId: "ctry_italia",
    citizenshipId: "ctry_italia",
    birthComuneId: "com_roma",
    documentTypeId: "doc_idele",
    documentNumber: "AB1234567",
    documentPlaceId: "com_roma",
    ...over,
  };
}

describe("StaysService", () => {
  let staysRepo: InMemoryStaysRepository;
  let schedineRepo: InMemorySchedinaRepository;
  let service: StaysService;

  beforeEach(() => {
    staysRepo = new InMemoryStaysRepository();
    staysRepo.setProperty("prop_1", { credentialId: "cred_1", alloggiatiApartmentId: null });
    schedineRepo = new InMemorySchedinaRepository();
    // "now" iniettato = 01/06/2026: gli arrivi-fixture (01/06) cadono così "oggi" (dentro finestra).
    service = new StaysService(staysRepo, schedineRepo, referenceLoader, {
      now: () => new Date("2026-06-01T12:00:00Z"),
    });
  });

  async function setupStayWithFamily() {
    const { id: stayId } = await service.createStay({
      organizationId: "org_1",
      propertyId: "prop_1",
      arrivalDate: new Date("2026-06-01T15:00:00.000Z"),
      departureDate: new Date("2026-06-04T10:00:00.000Z"),
      guestsCount: 2,
      isShortStay: false,
    });
    const family: Party = {
      tipo: "FAMIGLIA",
      capo: persona({ firstName: "Mario", documentNumber: "AB1" }),
      membri: [
        persona({
          firstName: "Lucia",
          documentTypeId: null,
          documentNumber: null,
          documentPlaceId: null,
        }),
      ],
    };
    const { guestIds } = await service.addGuests(stayId, "org_1", [family]);
    return { stayId, guestIds };
  }

  it("crea soggiorno + ospiti (capo + membro)", async () => {
    const { guestIds } = await setupStayWithFamily();
    expect(guestIds).toHaveLength(2);
  });

  it("genera una schedina PENDING per ogni ospite", async () => {
    const { stayId, guestIds } = await setupStayWithFamily();
    const res = await service.generateSchedine(stayId);
    expect(res.created).toBe(2);
    expect(res.existing).toBe(0);
    expect(res.schedinaIds).toHaveLength(guestIds.length);
    for (const sid of res.schedinaIds) {
      expect((await schedineRepo.findById(sid))?.status).toBe(SchedinaStatus.PENDING);
    }
  });

  it("anti-doppione: rigenerare lo stesso soggiorno non crea schedine nuove", async () => {
    const { stayId } = await setupStayWithFamily();
    await service.generateSchedine(stayId);
    const second = await service.generateSchedine(stayId);
    expect(second.created).toBe(0);
    expect(second.existing).toBe(2);
  });

  it("data di arrivo fuori finestra (oltre ieri) → errore, nessuna schedina", async () => {
    // "now" iniettato = 01/06; un arrivo del 28/05 è 4 giorni prima → fuori finestra.
    const { id: stayId } = await service.createStay({
      organizationId: "org_1",
      propertyId: "prop_1",
      arrivalDate: new Date("2026-05-28T15:00:00.000Z"),
      departureDate: new Date("2026-05-30T10:00:00.000Z"),
      guestsCount: 1,
      isShortStay: false,
    });
    await service.addGuests(stayId, "org_1", [{ tipo: "SINGOLO", ospite: persona() }]);
    await expect(service.generateSchedine(stayId)).rejects.toThrow(StaysError);
  });

  it("immobile senza credenziale Alloggiati → errore chiaro", async () => {
    staysRepo.setProperty("prop_2", { credentialId: null, alloggiatiApartmentId: null });
    const { id: stayId } = await service.createStay({
      organizationId: "org_1",
      propertyId: "prop_2",
      arrivalDate: new Date("2026-06-01T15:00:00.000Z"),
      departureDate: new Date("2026-06-02T15:00:00.000Z"),
      guestsCount: 1,
      isShortStay: false,
    });
    await service.addGuests(stayId, "org_1", [{ tipo: "SINGOLO", ospite: persona() }]);
    await expect(service.generateSchedine(stayId)).rejects.toThrow(StaysError);
  });

  it("ospite con dati mancanti → errore in generazione, nessuna schedina creata", async () => {
    const { id: stayId } = await service.createStay({
      organizationId: "org_1",
      propertyId: "prop_1",
      arrivalDate: new Date("2026-06-01T15:00:00.000Z"),
      departureDate: new Date("2026-06-03T10:00:00.000Z"),
      guestsCount: 1,
      isShortStay: false,
    });
    // ospite singolo (richiede documento) ma senza numero documento
    await service.addGuests(stayId, "org_1", [
      { tipo: "SINGOLO", ospite: persona({ documentNumber: null }) },
    ]);
    await expect(service.generateSchedine(stayId)).rejects.toThrow();
  });

  it("createStay valida i dati (guestsCount ≥ 1, partenza ≥ arrivo)", async () => {
    await expect(
      service.createStay({
        organizationId: "org_1",
        propertyId: "prop_1",
        arrivalDate: new Date("2026-06-01T00:00:00.000Z"),
        departureDate: null,
        guestsCount: 0,
        isShortStay: false,
      }),
    ).rejects.toThrow(StaysError);
    await expect(
      service.createStay({
        organizationId: "org_1",
        propertyId: "prop_1",
        arrivalDate: new Date("2026-06-10T00:00:00.000Z"),
        departureDate: new Date("2026-06-08T00:00:00.000Z"),
        guestsCount: 1,
        isShortStay: false,
      }),
    ).rejects.toThrow(StaysError);
  });
});
