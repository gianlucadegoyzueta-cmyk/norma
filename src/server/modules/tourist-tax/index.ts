// Superficie pubblica del modulo Tassa di soggiorno.
// Fase 1: dominio puro (tipi regola + calcolatore).
// Fase 2: selezione versione per data, seed regole, port + adapter Prisma della config.

export * from "./domain/rule";
export * from "./domain/calculator";
export * from "./domain/version-select";
export * from "./domain/seed-data";
export * from "./ports/TouristTaxConfigRepository";
export * from "./adapters/PrismaTouristTaxConfigRepository";
export * from "./services/estimate.service";
