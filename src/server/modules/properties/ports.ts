// PORT del modulo Immobili.
// Unifichiamo "Immobile" (nostro concetto) e "Appartamento" (concetto Alloggiati): vedi
// `Property` in schema.prisma. Per le credenziali SINGOLA l'immobile resta senza
// `alloggiatiApartmentId`; per le GESTIONE_APPARTAMENTI lo riceverà da `AggiungiAppartamento`
// (fase successiva).

export interface CreatePropertyInput {
  organizationId: string;
  name: string;
  address: string;
  comuneId: string;
  proprietario: string;
  /** Credenziale con cui si inviano le schedine. Null = immobile non ancora collegato. */
  credentialId: string | null;
}

/**
 * Configurazione ricettiva per il movimento turistico (Ross1000): codice struttura assegnato
 * dall'ente + capacità. Alimentano il file `<movimenti>` ISTAT. `null` = non configurato (la
 * readiness ISTAT lo segnala come INCOMPLETE). Vedi `Property` in schema.prisma.
 */
export interface UpdateRoss1000ConfigInput {
  organizationId: string;
  propertyId: string;
  ross1000Code: string | null;
  camereDisponibili: number | null;
  lettiDisponibili: number | null;
}

export interface PropertyComune {
  id: string;
  name: string;
  provincia: string;
}

export interface PropertyCredential {
  id: string;
  label: string;
}

/** Riga immobile come serve alla UI (Comune e credenziale già risolti). */
export interface PropertyListItem {
  id: string;
  name: string;
  address: string;
  proprietario: string;
  comune: PropertyComune;
  credential: PropertyCredential | null;
  alloggiatiApartmentId: string | null;
}

export interface PropertyRepository {
  create(input: CreatePropertyInput): Promise<{ id: string }>;
  listByOrganization(organizationId: string): Promise<PropertyListItem[]>;
  /** Provincia (sigla) del Comune scelto; null se il Comune non esiste/non è sincronizzato. */
  getComuneProvincia(comuneId: string): Promise<string | null>;
  /**
   * Aggiorna la configurazione ricettiva Ross1000 di un immobile. Scoped per org (isolamento by
   * query): `updated=false` se l'immobile non esiste o è di un'altra organizzazione.
   */
  updateRoss1000Config(input: UpdateRoss1000ConfigInput): Promise<{ updated: boolean }>;
}

/**
 * Lookup minimale di una credenziale: serve a `PropertiesService` per l'ISOLAMENTO
 * (la credenziale deve appartenere all'org) e per il vincolo di provincia. Tenerlo dietro
 * un'interfaccia evita di dipendere dall'adapter Prisma di Alloggiati nei test.
 */
export interface CredentialLookup {
  /** Filtrata per organizationId: una credenziale di un'altra org → null (isolamento by query). */
  get(
    credentialId: string,
    organizationId: string,
  ): Promise<{ id: string; organizationId: string; provincia: string; label: string } | null>;
}
