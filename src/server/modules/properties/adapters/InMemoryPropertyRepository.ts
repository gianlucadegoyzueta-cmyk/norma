import type {
  CreatePropertyInput,
  PropertyComune,
  PropertyListItem,
  PropertyRepository,
} from "../ports";

/** Repository immobili IN MEMORIA per i test (niente DB). */
export class InMemoryPropertyRepository implements PropertyRepository {
  private readonly rows = new Map<string, PropertyListItem & { organizationId: string }>();
  private readonly comuni = new Map<string, PropertyComune>();
  private readonly credentials = new Map<string, { id: string; label: string }>();
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
}
