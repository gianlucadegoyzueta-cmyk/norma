import { afterEach, describe, expect, it } from "vitest";
import { GET } from "../assetlinks.json/route";

const prevEnv = { ...process.env };

afterEach(() => {
  process.env = { ...prevEnv };
});

describe("assetlinks route", () => {
  it("usa package e fingerprint da env", async () => {
    process.env.ANDROID_APP_PACKAGE = "casa.norma.app";
    process.env.ANDROID_APP_SHA256 = "AA:BB:CC,DD:EE:FF";
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toMatch(/max-age=3600/);
    const body = (await res.json()) as Array<{
      target: { package_name: string; sha256_cert_fingerprints: string[] };
    }>;
    expect(body[0]?.target.package_name).toBe("casa.norma.app");
    expect(body[0]?.target.sha256_cert_fingerprints).toEqual(["AA:BB:CC", "DD:EE:FF"]);
  });

  it("usa placeholder quando manca fingerprint", async () => {
    process.env.ANDROID_APP_PACKAGE = "casa.norma.app";
    delete process.env.ANDROID_APP_SHA256;
    const res = await GET();
    const body = (await res.json()) as Array<{
      target: { sha256_cert_fingerprints: string[] };
    }>;
    expect(body[0]?.target.sha256_cert_fingerprints).toEqual([
      "REPLACE_WITH_SHA256_FINGERPRINT_OF_SIGNING_CERT",
    ]);
  });
});
