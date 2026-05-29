import { NextResponse } from "next/server";

// Health check leggero per load balancer / orchestratori / Docker HEALTHCHECK.
// Non tocca il database: deve restare veloce e senza dipendenze esterne.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
