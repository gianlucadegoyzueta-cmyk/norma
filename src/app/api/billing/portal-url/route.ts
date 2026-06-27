import { NextResponse } from "next/server";
import { portalUrlForCurrentContext } from "@/app/billing/url";

export async function POST(): Promise<Response> {
  const result = await portalUrlForCurrentContext();
  if (!result.ok) {
    const status = result.reason === "NO_CUSTOMER" ? 409 : 401;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ url: result.url });
}
