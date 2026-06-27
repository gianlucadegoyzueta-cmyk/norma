import { NextResponse } from "next/server";

/**
 * Android App Links: associa dominio ↔ package/certificato.
 * Supporta più fingerprint (es. upload key + app signing key Play).
 */
export async function GET() {
  const packageName = process.env.ANDROID_APP_PACKAGE ?? "casa.norma.app";
  const fingerprints = (process.env.ANDROID_APP_SHA256 ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const sha256CertFingerprints =
    fingerprints.length > 0 ? fingerprints : ["REPLACE_WITH_SHA256_FINGERPRINT_OF_SIGNING_CERT"];

  return NextResponse.json(
    [
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: packageName,
          sha256_cert_fingerprints: sha256CertFingerprints,
        },
      },
    ],
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
