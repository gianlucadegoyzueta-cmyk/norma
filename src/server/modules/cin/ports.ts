import type { CinStatus } from "@prisma/client";

/** Riga immobile con i campi CIN necessari al modulo. */
export interface PropertyCinRecord {
  id: string;
  name: string;
  cin: string | null;
  cinStatus: CinStatus;
}

export interface CinRepository {
  /** Aggiorna CIN e stato. Filtra per organizationId (isolamento tenant). */
  updateCin(
    organizationId: string,
    propertyId: string,
    data: { cin: string | null; cinStatus: CinStatus },
  ): Promise<void>;

  listByOrganization(organizationId: string): Promise<PropertyCinRecord[]>;

  /** Null se l'immobile non esiste o appartiene a un'altra org. */
  getById(organizationId: string, propertyId: string): Promise<PropertyCinRecord | null>;
}
