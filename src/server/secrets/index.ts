import { LocalSecretsVault } from "./LocalSecretsVault";
import type { SecretsVault } from "./SecretsVault";

// Punto unico da cui ottenere il vault dei segreti.
// Domani qui sceglieremo l'implementazione in base all'ambiente
// (es. un backend cloud in produzione) senza toccare il resto del codice.
let instance: SecretsVault | null = null;

export function getSecretsVault(): SecretsVault {
  if (!instance) {
    instance = new LocalSecretsVault();
  }
  return instance;
}

export type { AlloggiatiSecret, SecretsVault } from "./SecretsVault";
