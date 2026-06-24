import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Header di sicurezza applicati a tutte le risposte.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Build autosufficiente per i container (Docker). Su Vercel viene ignorato.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // Ancora la root del workspace alla cartella del progetto: evita che Next scelga un
  // package-lock.json esterno (es. nella home) e sbagli il file tracing in build.
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Apple richiede l'Apple App Site Association servito come application/json. Il file è
        // senza estensione (public/.well-known/apple-app-site-association): forziamo il
        // Content-Type per far funzionare gli Universal Links iOS.
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
};

// Sentry: avvolge la config solo se il DSN è presente, così dev/CI senza DSN buildano
// identici a prima. L'upload dei sourcemap avviene solo con SENTRY_AUTH_TOKEN (assente =
// nessun upload, build comunque verde). Org su regione EU (de.sentry.io).
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: "norma-i2",
      project: "norma-app",
      sentryUrl: "https://de.sentry.io",
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      // Evita ad-blocker che bloccano il path /monitoring instradando via il dominio del sito.
      tunnelRoute: "/monitoring",
    })
  : nextConfig;
