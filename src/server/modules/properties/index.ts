// Superficie pubblica del modulo Immobili.
// (InMemoryPropertyRepository è escluso: è un aiuto per i test.)

export * from "./domain/validation";
export * from "./ports";
export * from "./services/properties.service";
export * from "./adapters/PrismaPropertyRepository";
export * from "./adapters/PrismaCredentialLookup";
