import { NextResponse } from "next/server";
import { getCurrentContext } from "@/server/auth/session";
import { prisma } from "@/server/db";
import { PrismaDeviceTokenRepository } from "@/server/modules/notifications";

// Registrazione/deregistrazione dei device token push dell'utente loggato (chiamata dall'app
// nativa dopo il consenso alle notifiche). Auth obbligatoria: il token è legato allo User.
// Nessun invio qui: solo persistenza. La consegna reale resta gated (PR2 + chiavi).
export const dynamic = "force-dynamic";

function isPlatform(v: unknown): v is "IOS" | "ANDROID" {
  return v === "IOS" || v === "ANDROID";
}

/** Estrae e valida `{ token, platform }` dal body JSON. */
async function parseBody(
  request: Request,
): Promise<{ token: string; platform: "IOS" | "ANDROID" } | null> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const token = (raw as { token?: unknown }).token;
  const platform = (raw as { platform?: unknown }).platform;
  if (typeof token !== "string" || token.length < 8 || token.length > 4096) return null;
  if (!isPlatform(platform)) return null;
  return { token, platform };
}

export async function POST(request: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await parseBody(request);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const repo = new PrismaDeviceTokenRepository(prisma);
  await repo.register(ctx.user.id, { token: body.token, platform: body.platform });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const ctx = await getCurrentContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await parseBody(request);
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const repo = new PrismaDeviceTokenRepository(prisma);
  await repo.remove(body.token);
  return NextResponse.json({ ok: true });
}
