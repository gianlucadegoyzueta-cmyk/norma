// Inizializzazione Sentry per l'Edge runtime (middleware, edge routes). Stessa filosofia del
// server config: nessuna PII, attivo solo in produzione con DSN.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: Boolean(process.env.SENTRY_DSN) && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  debug: false,
});
