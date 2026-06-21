// Astrazione delle CREDENZIALI REGIONALI per-struttura (movimento turistico, canali AUTO).
//
// Le credenziali sono DEL CLIENTE (ogni host ha il proprio accesso al portale regionale): Norma le
// custodisce e trasmette per suo conto. I VALORI SEGRETI non stanno qui — il provider durevole (Prisma)
// li terrà nel SecretsVault dietro un `secretRef` opaco, come già fa AlloggiatiCredential.
//
// Questo modulo definisce la PORTA + un provider in-memory (dev/test). Il provider Prisma, il modello
// `RegionalCredential` e la migrazione sono PARCHEGGIATI (NEEDS-HUMAN §9, guardrail #2: niente migrazione
// in prod senza backup). L'opt-in `autoTransmit` è lo specchio di `AlloggiatiCredential.autoSend`.

import type { RegionSerializerId } from "./routing";

/** Segreti di accesso (es. Sicilia {userId,password}; Campania {cusr,apiKey}). Mai loggati, mai in chiaro nel DB. */
export type RegionalSecret = Record<string, string>;

/** Dati NON segreti necessari alla trasmissione (es. Sicilia {hotelCode}). */
export type RegionalConfig = Record<string, string>;

export type RegionalCredentialStatus = "ACTIVE" | "PENDING" | "DISABLED";

export interface ResolvedRegionalCredential {
  secret: RegionalSecret;
  config: RegionalConfig;
  /** Opt-in del cliente all'invio automatico (default false): l'host decide quando fidarsi. */
  autoTransmit: boolean;
  status: RegionalCredentialStatus;
}

/** Sorgente delle credenziali regionali per (struttura, serializer). */
export interface RegionalCredentialProvider {
  get(
    propertyId: string,
    serializerId: RegionSerializerId,
  ): Promise<ResolvedRegionalCredential | null>;
}

/** Implementazione in-memory per sviluppo e test (nessuna persistenza, nessun vault). */
export class InMemoryRegionalCredentialProvider implements RegionalCredentialProvider {
  private readonly store = new Map<string, ResolvedRegionalCredential>();

  private key(propertyId: string, serializerId: RegionSerializerId): string {
    return `${propertyId}::${serializerId}`;
  }

  set(
    propertyId: string,
    serializerId: RegionSerializerId,
    cred: ResolvedRegionalCredential,
  ): void {
    this.store.set(this.key(propertyId, serializerId), cred);
  }

  async get(
    propertyId: string,
    serializerId: RegionSerializerId,
  ): Promise<ResolvedRegionalCredential | null> {
    return this.store.get(this.key(propertyId, serializerId)) ?? null;
  }
}

/** Una credenziale è utilizzabile per l'AUTO-invio solo se ACTIVE e con opt-in. */
export function canAutoTransmit(cred: ResolvedRegionalCredential | null): boolean {
  return cred != null && cred.status === "ACTIVE" && cred.autoTransmit;
}
