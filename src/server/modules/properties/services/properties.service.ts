import { comuneProvinciaMatchesCredential } from "../domain/validation";
import type {
  CreatePropertyInput,
  CredentialLookup,
  PropertyListItem,
  PropertyRepository,
} from "../ports";

export class PropertiesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PropertiesError";
  }
}

/**
 * Servizio immobili. Crea/elenca gli immobili applicando due garanzie:
 *  - ISOLAMENTO: una credenziale collegata deve appartenere alla STESSA organizzazione;
 *  - vincolo PROVINCIA: il Comune dell'immobile deve ricadere nella provincia della credenziale
 *    (vedi `comuneProvinciaMatchesCredential` e docs/alloggiati-web-architettura.md §4).
 */
export class PropertiesService {
  constructor(
    private readonly properties: PropertyRepository,
    private readonly credentials: CredentialLookup,
  ) {}

  async createProperty(input: CreatePropertyInput): Promise<{ id: string }> {
    const name = input.name.trim();
    const address = input.address.trim();
    const proprietario = input.proprietario.trim();
    const comuneId = input.comuneId.trim();

    if (!name) throw new PropertiesError("Il nome dell'immobile è obbligatorio.");
    if (!address) throw new PropertiesError("L'indirizzo è obbligatorio.");
    if (!proprietario) throw new PropertiesError("Il nominativo del proprietario è obbligatorio.");
    if (!comuneId) throw new PropertiesError("Seleziona il Comune dell'immobile.");

    const comuneProvincia = await this.properties.getComuneProvincia(comuneId);
    if (!comuneProvincia) {
      throw new PropertiesError(
        "Comune non valido o tabelle di riferimento non ancora sincronizzate.",
      );
    }

    let credentialId: string | null = null;
    if (input.credentialId) {
      const cred = await this.credentials.get(input.credentialId);
      // Isolamento: mai collegare a una credenziale di un'altra organizzazione.
      if (!cred || cred.organizationId !== input.organizationId) {
        throw new PropertiesError("Credenziale non trovata per questa organizzazione.");
      }
      if (!comuneProvinciaMatchesCredential(comuneProvincia, cred.provincia)) {
        throw new PropertiesError(
          `Il Comune scelto è in provincia ${comuneProvincia}, ma la credenziale "${cred.label}" ` +
            `opera nella provincia ${cred.provincia}. Alloggiati accetta solo immobili nella ` +
            "provincia di competenza della credenziale: scegli un Comune di quella provincia " +
            "oppure una credenziale diversa.",
        );
      }
      credentialId = cred.id;
    }

    return this.properties.create({
      organizationId: input.organizationId,
      name,
      address,
      proprietario,
      comuneId,
      credentialId,
    });
  }

  async listProperties(organizationId: string): Promise<PropertyListItem[]> {
    return this.properties.listByOrganization(organizationId);
  }
}
