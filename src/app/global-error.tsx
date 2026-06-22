"use client";

// Cattura gli errori di rendering React non gestiti (root del segmento) e li manda a Sentry,
// poi mostra un fallback sobrio nel linguaggio del brand. Solo per crash gravi del root layout.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="it">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f7f2e8",
          color: "#211c15",
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Qualcosa è andato storto.</h1>
          <p style={{ color: "#5b5347", marginBottom: 24, lineHeight: 1.6 }}>
            Abbiamo registrato il problema e ci stiamo lavorando. Riprova tra un momento.
          </p>
          {/* Full reload intenzionale: dopo un crash del root layout il Router client può
              essere compromesso, quindi NON usiamo next/link qui. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              display: "inline-block",
              background: "#bc4b2b",
              color: "#fbf9f3",
              textDecoration: "none",
              fontWeight: 600,
              padding: "12px 24px",
              borderRadius: 999,
            }}
          >
            Torna alla home
          </a>
        </div>
      </body>
    </html>
  );
}
