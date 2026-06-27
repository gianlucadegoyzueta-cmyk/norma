import { NextResponse } from "next/server";
import { checkoutUrlForCurrentContext } from "@/app/billing/url";

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => ({}))) as { plan?: string };
  const result = await checkoutUrlForCurrentContext(body.plan ?? null);
  if (!result.ok) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json({ url: result.url });
}
