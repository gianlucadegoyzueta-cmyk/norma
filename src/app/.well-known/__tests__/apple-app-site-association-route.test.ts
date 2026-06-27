import { afterEach, describe, expect, it } from "vitest";
import { GET } from "../apple-app-site-association/route";

const prevEnv = { ...process.env };

afterEach(() => {
  process.env = { ...prevEnv };
});

describe("AASA route", () => {
  it("usa env APPLE_TEAM_ID/NATIVE_BUNDLE_ID quando presenti", async () => {
    process.env.APPLE_TEAM_ID = "TEAM123";
    process.env.NATIVE_BUNDLE_ID = "casa.norma.app";
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toMatch(/max-age=3600/);
    const body = (await res.json()) as {
      applinks: { details: Array<{ appID: string; paths: string[] }> };
    };
    expect(body.applinks.details[0]?.appID).toBe("TEAM123.casa.norma.app");
    expect(body.applinks.details[0]?.paths).toContain("/checkin/*");
  });

  it("usa fallback safe in assenza env", async () => {
    delete process.env.APPLE_TEAM_ID;
    delete process.env.NATIVE_BUNDLE_ID;
    const res = await GET();
    const body = (await res.json()) as {
      applinks: { details: Array<{ appID: string }> };
    };
    expect(body.applinks.details[0]?.appID).toBe("TEAMID.casa.norma.app");
  });
});
