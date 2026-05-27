import type { ReferenceTables, ResolverGuest } from "../domain/resolver";

/**
 * Carica (precaricandole in memoria) le tabelle di riferimento necessarie a un insieme di ospiti,
 * e ne restituisce un `ReferenceTables` per il resolver. È un concetto di livello Alloggiati:
 * il resolver è puro e vuole i lookup già pronti, questo port fa il ponte col DB.
 */
export interface ReferenceTablesLoader {
  loadForGuests(guests: (ResolverGuest & { id: string })[]): Promise<ReferenceTables>;
}
