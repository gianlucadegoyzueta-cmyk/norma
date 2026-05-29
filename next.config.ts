import type { NextConfig } from "next";

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
    ];
  },
};

export default nextConfig;
