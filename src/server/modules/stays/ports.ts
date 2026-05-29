import type { SchedinaStatus, TipoAlloggiato } from "@prisma/client";
import type { ResolverGuest } from "../alloggiati";
import type { Party } from "./domain/parties";

// Il loader delle tabelle di riferimento è un concetto di livello Alloggiati: lo ri-esportiamo
// così il resto del modulo stays continua a importarlo da "../ports" senza cambiamenti.
export type { ReferenceTablesLoader } from "../alloggiati";

export interface CreateStayInput {
  organizationId: string;
  propertyId: string;
  arrivalDate: Date;
  departureDate: Date | null;
  guestsCount: number;
  isShortStay: boolean;
}

/** Tutto ciò che serve per generare le schedine di un soggiorno. */
export interface StayForGeneration {
  organizationId: string;
  credentialId: string | null; // dall'immobile; null se non collegato a una credenziale Alloggiati
  alloggiatiApartmentId: string | null;
  stay: { arrivalDate: Date; departureDate: Date | null; isShortStay: boolean };
  guests: (ResolverGuest & { id: string })[];
}

/** Conteggio delle schedine di un soggiorno per stato (per il riepilogo in lista). */
export interface SchedinaStatusCounts {
  total: number;
  pending: number;
  sending: number;
  acquired: number;
  rejected: number;
  unverified: number;
}

/** Riga soggiorno come serve alla lista (immobile risolto + riepilogo schedine). */
export interface StayListItem {
  id: string;
  propertyName: string;
  comuneName: string;
  provincia: string;
  hasCredential: boolean;
  arrivalDate: Date;
  departureDate: Date | null;
  isShortStay: boolean;
  guestsCount: number; // dichiarato alla creazione
  guestsAdded: number; // ospiti effettivamente inseriti
  schedine: SchedinaStatusCounts;
}

/** Un ospite come serve alla pagina di dettaglio (anagrafica essenziale + stato schedina). */
export interface StayDetailGuest {
  id: string;
  firstName: string;
  lastName: string;
  tipoAlloggiato: TipoAlloggiato;
  leaderId: string | null;
  hasDocument: boolean;
  schedinaStatus: SchedinaStatus | null;
}

/** Dettaglio completo di un soggiorno per la pagina `/stays/[id]`. */
export interface StayDetail {
  id: string;
  organizationId: string;
  propertyName: string;
  comuneName: string;
  provincia: string;
  hasCredential: boolean;
  arrivalDate: Date;
  departureDate: Date | null;
  isShortStay: boolean;
  guestsCount: number;
  guests: StayDetailGuest[];
}

export interface StaysRepository {
  createStay(input: CreateStayInput): Promise<{ id: string }>;
  addGuests(
    stayId: string,
    organizationId: string,
    parties: Party[],
  ): Promise<{ guestIds: string[] }>;
  loadForGeneration(stayId: string): Promise<StayForGeneration | null>;
  listByOrganization(organizationId: string): Promise<StayListItem[]>;
  getStayDetail(stayId: string, organizationId: string): Promise<StayDetail | null>;
}
