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

export interface StaysRepository {
  createStay(input: CreateStayInput): Promise<{ id: string }>;
  addGuests(
    stayId: string,
    organizationId: string,
    parties: Party[],
  ): Promise<{ guestIds: string[] }>;
  loadForGeneration(stayId: string): Promise<StayForGeneration | null>;
}
