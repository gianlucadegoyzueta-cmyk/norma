// Superficie pubblica del modulo Alloggiati.
// (InMemorySchedinaRepository è volutamente escluso: è un aiuto per i test.)

export * from "./domain/dedup";
export * from "./domain/resolver";
export * from "./domain/tracciato";
export * from "./domain/transitions";
export * from "./domain/types";
export * from "./domain/reference";
export * from "./ports/AlloggiatiSender";
export * from "./ports/SchedinaRepository";
export * from "./ports/AcquisitionReceiptReader";
export * from "./ports/ReferenceTablesLoader";
export * from "./ports/reference";
export * from "./adapters/PrismaSchedinaRepository";
export * from "./adapters/PrismaCredentialRepository";
export * from "./adapters/PrismaReferenceTablesLoader";
export * from "./adapters/PrismaReferenceTableRepository";
export * from "./adapters/FakeAlloggiatiSender";
export * from "./adapters/SoapAlloggiatiSender";
export * from "./adapters/SoapAcquisitionReceiptReader";
export * from "./adapters/SoapTabellaClient";
export * from "./adapters/FakeTabellaClient";
export * from "./services/outbox.service";
export * from "./services/verify.service";
export * from "./services/reconcile.service";
export * from "./services/credential.service";
export * from "./services/table-sync.service";
export * from "./services/record-builder.service";
export * from "./services/reference-health";
export * from "./soap";
