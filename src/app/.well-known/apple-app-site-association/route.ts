import { NextResponse } from "next/server";

/**
 * Universal Links iOS: risposta JSON servita da app.norma.casa.
 * Valori configurabili via env per evitare placeholder hardcoded nel file statico.
 */
export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID ?? "TEAMID";
  const bundleId = process.env.NATIVE_BUNDLE_ID ?? "casa.norma.app";

  return NextResponse.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: `${teamId}.${bundleId}`,
            paths: ["/checkin/*", "/auth/reset", "/auth/reset/*"],
          },
        ],
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
