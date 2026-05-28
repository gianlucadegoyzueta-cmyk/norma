import { prisma } from "../db";
import { PrismaSecretsVault } from "./PrismaSecretsVault";
import type { SecretsVault } from "./SecretsVault";

// Punto unico da cui ottenere il vault dei segreti.
// Implementazione DUREVOLE su database (PrismaSecretsVault): funziona anche su runtime serverless
// (Vercel), dove il vault su file (LocalSecretsVault, solo per dev offline) sparirebbe. In futuro
// si potrà passare a un backend cloud (AWS/GCP Secrets Manager) cambiando SOLO questa funzione.
let instance: SecretsVault | null = null;

export function getSecretsVault(): SecretsVault {
  if (!instance) {
    instance = new PrismaSecretsVault(prisma);
  }
  return instance;
}

export type { AlloggiatiSecret, SecretsVault } from "./SecretsVault";
export { PrismaSecretsVault } from "./PrismaSecretsVault";
