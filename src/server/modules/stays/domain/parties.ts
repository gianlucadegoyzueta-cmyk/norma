import type { Sex, TipoAlloggiato } from "@prisma/client";

/**
 * Dati anagrafici di un ospite. NON include `tipoAlloggiato`: quello lo deriva la STRUTTURA
 * della comitiva (singolo / capo / membro), così non si possono avere incoerenze.
 */
export interface GuestData {
  firstName: string;
  lastName: string;
  sex: Sex;
  birthDate: Date;
  birthCountryId: string;
  citizenshipId: string;
  birthComuneId?: string | null;
  // Residenza (provenienza) — opzionale, per ISTAT/check-in. Non usata da Alloggiati.
  residenceCountryId?: string | null;
  residenceComuneId?: string | null;
  residenceForeignLocality?: string | null; // luogo di residenza estero (Ross1000 <luogoresidenza>)
  // Movimento turistico (Ross1000) — opzionali, non usati da Alloggiati.
  tourismType?: string | null;
  transportMeans?: string | null;
  documentTypeId?: string | null;
  documentNumber?: string | null;
  documentPlaceId?: string | null;
}

export type PartyTipo = "SINGOLO" | "FAMIGLIA" | "GRUPPO";

/** Una "comitiva": ospite singolo, oppure capo + membri (famiglia o gruppo). */
export type Party =
  | { tipo: "SINGOLO"; ospite: GuestData }
  | { tipo: "FAMIGLIA"; capo: GuestData; membri: GuestData[] }
  | { tipo: "GRUPPO"; capo: GuestData; membri: GuestData[] };

/**
 * Codici tipo-alloggiato derivati dal tipo di comitiva:
 *  - SINGOLO  → 16 (Ospite Singolo)
 *  - FAMIGLIA → capo 17 (Capo Famiglia), membri 19 (Familiare)
 *  - GRUPPO   → capo 18 (Capo Gruppo),   membri 20 (Membro Gruppo)
 */
export function tipiPerParty(tipo: PartyTipo): {
  capo: TipoAlloggiato;
  membro: TipoAlloggiato | null;
} {
  switch (tipo) {
    case "SINGOLO":
      return { capo: "OSPITE_SINGOLO", membro: null };
    case "FAMIGLIA":
      return { capo: "CAPO_FAMIGLIA", membro: "FAMILIARE" };
    case "GRUPPO":
      return { capo: "CAPO_GRUPPO", membro: "MEMBRO_GRUPPO" };
  }
}
