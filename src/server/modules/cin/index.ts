// Superficie pubblica del modulo CIN (Codice Identificativo Nazionale).

export * from "./domain/cin";
export * from "./ports";
export * from "./ports/CinVerifier";
export * from "./services/cin.service";
export * from "./adapters/PrismaCinRepository";
export * from "./adapters/StubCinVerifier";
