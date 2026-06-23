import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import { SupportWidget } from "@/components/support-widget";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

// Display font di brand (come il marketing norma.casa): serif Fraunces sui titoli, servita
// localmente via next/font/local dai woff2 variabili in src/app/fonts (OFL inclusa) — niente
// dipendenza da Google Fonts a runtime, coerente con norma-marketing.
const fraunces = localFont({
  variable: "--font-fraunces",
  display: "swap",
  src: [
    { path: "./fonts/Fraunces-roman.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/Fraunces-italic.woff2", weight: "100 900", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "Norma — Affitti Brevi",
    template: "%s · Norma",
  },
  description:
    "Norma: SaaS di compliance per affitti brevi in Italia — gestione credenziali e invii ad Alloggiati Web.",
  applicationName: "Norma",
  // PWA: manifest + icona Apple (apple-touch-icon) per l'aggiunta alla home su iOS.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Norma",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  // `viewport-fit=cover`: usa l'intero schermo sotto la notch su iOS (con le safe-area della bottom-bar).
  viewportFit: "cover",
  // Norma è un brand a tema unico "Carta & Inchiostro": sempre carta chiara, nessun dark mode.
  themeColor: "#f7f2e8",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} min-h-dvh antialiased`}
      >
        {children}
        <SupportWidget />
        {/* Vercel Web Analytics: cookieless, nessuna PII, nessun consent banner.
            Scelta deliberata sull'app (gestisce dati ospiti) → niente session recording. */}
        <Analytics />
      </body>
    </html>
  );
}
