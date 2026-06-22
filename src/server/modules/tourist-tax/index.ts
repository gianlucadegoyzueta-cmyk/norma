// Superficie pubblica del modulo Tassa di soggiorno.
// Fase 1: dominio puro (tipi regola + calcolatore).
// Fase 2: selezione versione per data, seed regole, port + adapter Prisma della config.

export * from "./domain/rule";
export * from "./domain/calculator";
export * from "./domain/version-select";
export * from "./domain/seed-data";
export * from "./domain/declaration";
export * from "./domain/period";
export * from "./domain/export-csv";
export * from "./domain/take-rate";
export * from "./domain/take-rate-config";
export * from "./ports/TouristTaxConfigRepository";
export * from "./ports/TouristTaxDeclarationRepository";
export * from "./ports/RemittanceChannel";
export * from "./ports/FeeCollectionChannel";
export * from "./adapters/PrismaTouristTaxConfigRepository";
export * from "./adapters/PrismaTouristTaxDeclarationRepository";
export * from "./adapters/remittance/resolver";
export * from "./adapters/fee-collection/StubFeeCollection";
export * from "./services/estimate.service";
export * from "./services/declaration.service";
