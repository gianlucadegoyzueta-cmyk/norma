// Inizializzazione Sentry lato server (Node runtime). Importata da src/instrumentation.ts.
// Norma è un'app di compliance che maneggia PII degli ospiti: sendDefaultPii è FALSE per
// costruzione (GDPR) — non inviamo mai dati personali a Sentry. Attivo solo in produzione
// con DSN presente, così dev/test/CI restano puliti.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN) && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  // Mai PII di default: niente IP, cookie, header sensibili, body con dati ospite.
  sendDefaultPii: false,
  // Performance tracing leggero in produzione per non gonfiare i costi.
  tracesSampleRate: 0.1,
  // Niente log spammosi in console.
  debug: false,
});
