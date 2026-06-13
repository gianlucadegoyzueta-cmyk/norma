// Hook di strumentazione Next.js: carica la config Sentry giusta in base al runtime e
// inoltra a Sentry gli errori delle Server Action / route handler (onRequestError).
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
