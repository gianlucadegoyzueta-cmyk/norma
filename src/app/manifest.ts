import type { MetadataRoute } from "next";

// Manifest PWA: rende Norma installabile su telefono (icona sigillo, schermo intero, tema avorio).
// Niente service worker complesso — solo installabilità + navigazione decente da mobile.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Norma — Affitti Brevi",
    short_name: "Norma",
    description:
      "Compliance per affitti brevi: schedine Alloggiati, tassa di soggiorno, ISTAT, check-in ospiti.",
    lang: "it",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f2e8", // avorio
    theme_color: "#f7f2e8", // avorio
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
