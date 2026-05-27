import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ancora la root del workspace alla cartella del progetto: evita che Next scelga un
  // package-lock.json esterno (es. nella home) e sbagli il file tracing in build.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
