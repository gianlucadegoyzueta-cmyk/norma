// Superficie pubblica del modulo Notifications.
export * from "./domain/checkin-invite";
export * from "./ports";
export * from "./adapters/ResendEmailSender";
export * from "./service";
// FakeEmailSender è solo per i test → non esportato qui.
