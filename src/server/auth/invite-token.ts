import { createHmac, timingSafeEqual } from "node:crypto";
import type { MembershipRole } from "@prisma/client";

export interface TeamInviteTokenPayload {
  v: 1;
  orgId: string;
  orgName: string;
  email: string;
  role: MembershipRole;
  invitedBy: string;
  iat: number;
  exp: number;
}

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function parseRole(value: unknown): MembershipRole | null {
  if (value === "OWNER" || value === "ADMIN" || value === "MEMBER") return value;
  return null;
}

function secretOrThrow(secret?: string): string {
  const resolved = secret ?? process.env.AUTH_SECRET;
  if (!resolved)
    throw new Error("AUTH_SECRET mancante: impossibile firmare/verificare inviti team");
  return resolved;
}

export function createTeamInviteToken(
  payload: Omit<TeamInviteTokenPayload, "v" | "iat"> & { iat?: number },
  secret?: string,
): string {
  const now = payload.iat ?? Math.floor(Date.now() / 1000);
  const body = toBase64Url(
    JSON.stringify({
      v: 1,
      orgId: payload.orgId,
      orgName: payload.orgName,
      email: payload.email.toLowerCase().trim(),
      role: payload.role,
      invitedBy: payload.invitedBy,
      iat: now,
      exp: payload.exp,
    } satisfies TeamInviteTokenPayload),
  );
  const sig = sign(body, secretOrThrow(secret));
  return `${body}.${sig}`;
}

export function verifyTeamInviteToken(
  token: string,
  secret?: string,
): TeamInviteTokenPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, secretOrThrow(secret));
  try {
    const ok = timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    if (!ok) return null;
  } catch {
    return null;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(body));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const role = parseRole(obj.role);
  if (!role) return null;
  if (obj.v !== 1) return null;
  if (typeof obj.orgId !== "string" || !obj.orgId) return null;
  if (typeof obj.orgName !== "string" || !obj.orgName) return null;
  if (typeof obj.email !== "string" || !obj.email) return null;
  if (typeof obj.invitedBy !== "string" || !obj.invitedBy) return null;
  if (typeof obj.iat !== "number" || typeof obj.exp !== "number") return null;
  if (obj.exp <= Math.floor(Date.now() / 1000)) return null;

  return {
    v: 1,
    orgId: obj.orgId,
    orgName: obj.orgName,
    email: obj.email.toLowerCase().trim(),
    role,
    invitedBy: obj.invitedBy,
    iat: obj.iat,
    exp: obj.exp,
  };
}
