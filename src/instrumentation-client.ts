// Inizializzazione Sentry lato browser. Niente Session Replay (rischio PII: registrerebbe lo
// schermo con dati ospite). Attivo solo in produzione con DSN pubblico presente.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN) && process.env.NODE_ENV === "production",
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0.1,
  // Session Replay disattivato di proposito: cattura lo schermo → PII degli ospiti.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  debug: false,
});

// Permette a Sentry di tracciare le transizioni di navigazione dell'App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
