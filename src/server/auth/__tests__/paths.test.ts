import { describe, expect, it } from "vitest";
import { isPublicPath } from "../paths";

describe("isPublicPath", () => {
  it("riconosce le route pubbliche", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/auth")).toBe(true);
    expect(isPublicPath("/api/auth/callback/nodemailer")).toBe(true);
    expect(isPublicPath("/_next/static/chunk.js")).toBe(true);
    expect(isPublicPath("/favicon.ico")).toBe(true);
    expect(isPublicPath("/icon.svg")).toBe(true);
    expect(isPublicPath("/api/health")).toBe(true);
  });

  it("apre il flusso di registrazione e recupero a chi è sloggato", () => {
    expect(isPublicPath("/signup")).toBe(true);
    expect(isPublicPath("/auth/forgot")).toBe(true);
    expect(isPublicPath("/auth/check-email")).toBe(true);
    expect(isPublicPath("/auth/reset")).toBe(true);
    expect(isPublicPath("/auth/error")).toBe(true);
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
