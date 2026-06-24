import type {
  CreatePropertyInput,
  PropertyComune,
  PropertyListItem,
  PropertyRepository,
  UpdateRoss1000ConfigInput,
} from "../ports";

type Ross1000Config = {
  ross1000Code: string | null;
  camereDisponibili: number | null;
  lettiDisponibili: number | null;
};

/** Repository immobili IN MEMORIA per i test (niente DB). */
export class InMemoryPropertyRepository implements PropertyRepository {
  private readonly rows = new Map<string, PropertyListItem & { organizationId: string }>();
  private readonly comuni = new Map<string, PropertyComune>();
  private readonly credentials = new Map<string, { id: string; label: string }>();
  private readonly ross1000 = new Map<string, Ross1000Config>();
  private seq = 0;

  /** Helper per i test: registra un Comune selezionabile. */
  setComune(comune: PropertyComune): void {
    this.comuni.set(comune.id, comune);
  }

  /** Helper per i test: registra una credenziale (solo etichetta, per il listing). */
  setCredential(credential: { id: string; label: string }): void {
    this.credentials.set(credential.id, credential);
  }

  async create(input: CreatePropertyInput): Promise<{ id: string }> {
    const id = `prop_${++this.seq}`;
    const comune = this.comuni.get(input.comuneId);
    if (!comune) throw new Error(`Comune sconosciuto: ${input.comuneId}`);
    this.rows.set(id, {
      id,
      organizationId: input.organizationId,
      name: input.name,
      address: input.address,
      proprietario: input.proprietario,
      comune,
      credential: input.credentialId ? (this.credentials.get(input.credentialId) ?? null) : null,
      alloggiatiApartmentId: null,
    });
    return { id };
  }

  async listByOrganization(organizationId: string): Promise<PropertyListItem[]> {
    return [...this.rows.values()]
      .filter((r) => r.organizationId === organizationId)
      .map(({ organizationId: _org, ...item }) => item);
  }

  async getComuneProvincia(comuneId: string): Promise<string | null> {
    return this.comuni.get(comuneId)?.provincia ?? null;
  }

  async updateRoss1000Config(input: UpdateRoss1000ConfigInput): Promise<{ updated: boolean }> {
    const row = this.rows.get(input.propertyId);
    if (!row || row.organizationId !== input.organizationId) return { updated: false };
    this.ross1000.set(input.propertyId, {
      ross1000Code: input.ross1000Code,
      camereDisponibili: input.camereDisponibili,
      lettiDisponibili: input.lettiDisponibili,
    });
    return { updated: true };
  }

  /** Helper per i test: legge la configurazione ricettiva Ross1000 salvata (null se mai impostata). */
  getRoss1000Config(propertyId: string): Ross1000Config | null {
    return this.ross1000.get(propertyId) ?? null;
  }
}
