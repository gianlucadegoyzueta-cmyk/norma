import { describe, expect, it } from "vitest";
import { isPublicPath } from "../paths";

describe("isPublicPath", () => {
  it("riconosce le route pubbliche", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/auth")).toBe(true);
    expect(isPublicPath("/api/auth/callback/google")).toBe(true);
    expect(isPublicPath("/_next/static/chunk.js")).toBe(true);
    expect(isPublicPath("/favicon.ico")).toBe(true);
    expect(isPublicPath("/icon.svg")).toBe(true);
    expect(isPublicPath("/api/health")).toBe(true);
    // Cron Vercel: nessuna sessione utente, auth via CRON_SECRET nella route stessa.
    expect(isPublicPath("/api/cron/alloggiati")).toBe(true);
    expect(isPublicPath("/api/cron/istat")).toBe(true);
  });

  it("apre il flusso di registrazione e recupero a chi è sloggato", () => {
    expect(isPublicPath("/signup")).toBe(true);
    expect(isPublicPath("/auth/forgot")).toBe(true);
    expect(isPublicPath("/auth/reset")).toBe(true);
    expect(isPublicPath("/auth/error")).toBe(true);
    expect(isPublicPath("/checkin/abc123")).toBe(true);
  });

  it("apre i webhook esterni (firma del payload, non cookie)", () => {
    expect(isPublicPath("/api/webhooks/stripe")).toBe(true);
  });

  it("considera protette le altre route", () => {
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/api/schedine")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false); // niente match parziale errato
    expect(isPublicPath("/signupx")).toBe(false);
    expect(isPublicPath("/authx")).toBe(false);
  });
});
