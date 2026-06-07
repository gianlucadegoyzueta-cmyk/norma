import { describe, expect, it } from "vitest";
import { hashCheckinToken, isCheckinTokenUsable } from "../policy";

describe("hashCheckinToken", () => {
  it("è deterministico e in formato SHA-256 hex (64 char)", () => {
    const a = hashCheckinToken("abc");
    const b = hashCheckinToken("abc");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCheckinToken("abc")).not.toBe(hashCheckinToken("abd"));
  });
});

describe("isCheckinTokenUsable", () => {
  const now = Date.parse("2026-06-07T12:00:00Z");

  it("valido: non completato e non scaduto", () => {
    expect(isCheckinTokenUsable({ completedAt: null, expiresAt: new Date(now + 1000) }, now)).toBe(
      true,
    );
  });

  it("non valido se scaduto", () => {
    expect(isCheckinTokenUsable({ completedAt: null, expiresAt: new Date(now - 1000) }, now)).toBe(
      false,
    );
  });

  it("non valido se già completato", () => {
    expect(
      isCheckinTokenUsable(
        { completedAt: new Date(now - 5000), expiresAt: new Date(now + 1000) },
        now,
      ),
    ).toBe(false);
  });
});
