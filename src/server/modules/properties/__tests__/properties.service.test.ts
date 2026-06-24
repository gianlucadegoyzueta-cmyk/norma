import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryPropertyRepository } from "../adapters/InMemoryPropertyRepository";
import type { CredentialLookup } from "../ports";
import { PropertiesError, PropertiesService } from "../services/properties.service";

// Lookup credenziali in memoria: org_1 ha una credenziale a Roma (RM).
const credentials: Record<
  string,
  { id: string; organizationId: string; provincia: string; label: string }
> = {
  cred_rm: { id: "cred_rm", organizationId: "org_1", provincia: "RM", label: "Casa Roma" },
  cred_other_org: {
    id: "cred_other_org",
    organizationId: "org_2",
    provincia: "RM",
    label: "Di un'altra org",
  },
};
// Test double con lo stesso isolamento dell'adapter reale: ritorna la credenziale solo se
// appartiene all'organizationId richiesto (altrimenti null).
const credentialLookup: CredentialLookup = {
  get: async (id, organizationId) => {
    const c = credentials[id];
    return c && c.organizationId === organizationId ? c : null;
  },
};

function validInput(over: Partial<Parameters<PropertiesService["createProperty"]>[0]> = {}) {
  return {
    organizationId: "org_1",
    name: "Bilocale Trastevere",
    address: "Via della Lungaretta 1",
    comuneId: "com_roma",
    proprietario: "Mario Rossi",
    credentialId: "cred_rm" as string | null,
    ...over,
  };
}

describe("PropertiesService", () => {
  let repo: InMemoryPropertyRepository;
  let service: PropertiesService;

  beforeEach(() => {
    repo = new InMemoryPropertyRepository();
    repo.setComune({ id: "com_roma", name: "Roma", provincia: "RM" });
    repo.setComune({ id: "com_milano", name: "Milano", provincia: "MI" });
    repo.setCredential({ id: "cred_rm", label: "Casa Roma" });
    service = new PropertiesService(repo, credentialLookup);
  });

  it("crea un immobile valido collegato a una credenziale della stessa provincia", async () => {
    const { id } = await service.createProperty(validInput());
    const list = await service.listProperties("org_1");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id,
      name: "Bilocale Trastevere",
      comune: { provincia: "RM" },
      credential: { id: "cred_rm" },
    });
  });

  it("trimma i campi testuali", async () => {
    await service.createProperty(validInput({ name: "  Casa  ", proprietario: "  Tizio  " }));
    const [p] = await service.listProperties("org_1");
    expect(p.name).toBe("Casa");
    expect(p.proprietario).toBe("Tizio");
  });

  it("rifiuta un immobile in una provincia diversa da quella della credenziale", async () => {
    await expect(service.createProperty(validInput({ comuneId: "com_milano" }))).rejects.toThrow(
      PropertiesError,
    );
  });

  it("rifiuta una credenziale di un'altra organizzazione (isolamento)", async () => {
    await expect(
      service.createProperty(validInput({ credentialId: "cred_other_org" })),
    ).rejects.toThrow(PropertiesError);
  });

  it("rifiuta una credenziale inesistente", async () => {
    await expect(
      service.createProperty(validInput({ credentialId: "cred_ignota" })),
    ).rejects.toThrow(PropertiesError);
  });

  it("rifiuta un Comune non sincronizzato", async () => {
    await expect(service.createProperty(validInput({ comuneId: "com_ignoto" }))).rejects.toThrow(
      PropertiesError,
    );
  });

  it("consente un immobile senza credenziale (non ancora collegato)", async () => {
    const { id } = await service.createProperty(validInput({ credentialId: null }));
    const [p] = await service.listProperties("org_1");
    expect(p.id).toBe(id);
    expect(p.credential).toBeNull();
  });

  it("valida i campi obbligatori", async () => {
    await expect(service.createProperty(validInput({ name: "  " }))).rejects.toThrow(
      PropertiesError,
    );
    await expect(service.createProperty(validInput({ address: "" }))).rejects.toThrow(
      PropertiesError,
    );
    await expect(service.createProperty(validInput({ proprietario: "" }))).rejects.toThrow(
      PropertiesError,
    );
  });

  describe("updateRoss1000Config", () => {
    it("salva codice + capacità, normalizzando il codice (trim, vuoto → null)", async () => {
      const { id } = await service.createProperty(validInput());
      await service.updateRoss1000Config({
        organizationId: "org_1",
        propertyId: id,
        ross1000Code: "  012345  ",
        camereDisponibili: 3,
        lettiDisponibili: 6,
      });
      expect(repo.getRoss1000Config(id)).toEqual({
        ross1000Code: "012345",
        camereDisponibili: 3,
        lettiDisponibili: 6,
      });

      await service.updateRoss1000Config({
        organizationId: "org_1",
        propertyId: id,
        ross1000Code: "   ",
        camereDisponibili: null,
        lettiDisponibili: null,
      });
      expect(repo.getRoss1000Config(id)).toEqual({
        ross1000Code: null,
        camereDisponibili: null,
        lettiDisponibili: null,
      });
    });

    it("rifiuta capacità non intere o negative", async () => {
      const { id } = await service.createProperty(validInput());
      await expect(
        service.updateRoss1000Config({
          organizationId: "org_1",
          propertyId: id,
          ross1000Code: null,
          camereDisponibili: -1,
          lettiDisponibili: null,
        }),
      ).rejects.toThrow(PropertiesError);
      await expect(
        service.updateRoss1000Config({
          organizationId: "org_1",
          propertyId: id,
          ross1000Code: null,
          camereDisponibili: null,
          lettiDisponibili: 2.5,
        }),
      ).rejects.toThrow(PropertiesError);
    });

    it("rifiuta l'aggiornamento di un immobile di un'altra organizzazione (isolamento)", async () => {
      const { id } = await service.createProperty(validInput());
      await expect(
        service.updateRoss1000Config({
          organizationId: "org_2",
          propertyId: id,
          ross1000Code: "999",
          camereDisponibili: null,
          lettiDisponibili: null,
        }),
      ).rejects.toThrow(PropertiesError);
      // i dati dell'org legittima restano intatti
      expect(repo.getRoss1000Config(id)).toBeNull();
    });
  });
});
