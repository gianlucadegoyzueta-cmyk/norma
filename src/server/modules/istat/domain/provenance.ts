// Risoluzione della PROVENIENZA dell'ospite per ISTAT, a partire dai dati di residenza.
// PURA e testabile. Regole (in ordine):
//  1. se c'è il Comune di residenza → ITALIA, provincia = sigla del comune (il comune di residenza
//     viene valorizzato solo per i residenti in Italia → segnale affidabile, senza dover conoscere
//     il "codice Italia" della tabella Stati);
//  2. altrimenti, se c'è lo Stato di residenza → ESTERO con quello Stato;
//  3. altrimenti (residenza non raccolta) → FALLBACK APPROSSIMATO sulla cittadinanza, marcato
//     `approximated: true`. TODO: quando il check-in raccoglierà sempre la residenza, il fallback
//     diventerà marginale; per i cittadini italiani senza residenza la provincia resta ignota
//     (finiscono nel bucket "Italia" come Stato — approssimazione consapevole).

import type { Provenance } from "./aggregate";

export interface GuestProvenanceInput {
  residenceComune: { provincia: string } | null;
  residenceCountry: { code: string; name: string } | null;
  citizenship: { code: string; name: string };
}

export interface ResolvedProvenance {
  provenance: Provenance;
  /** true se dedotta dalla cittadinanza per mancanza di dati di residenza. */
  approximated: boolean;
}

export function resolveProvenance(g: GuestProvenanceInput): ResolvedProvenance {
  if (g.residenceComune) {
    return {
      provenance: { kind: "ITALIA", provincia: g.residenceComune.provincia },
      approximated: false,
    };
  }
  if (g.residenceCountry) {
    return {
      provenance: {
        kind: "ESTERO",
        countryCode: g.residenceCountry.code,
        countryName: g.residenceCountry.name,
      },
      approximated: false,
    };
  }
  return {
    provenance: {
      kind: "ESTERO",
      countryCode: g.citizenship.code,
      countryName: g.citizenship.name,
    },
    approximated: true,
  };
}
