#!/usr/bin/env node

/**
 * Preflight mobile release: verifica endpoint deep link e payload minimi.
 *
 * Uso:
 *   npm run mobile:preflight
 *   MOBILE_BASE_URL=https://staging.app.norma.casa npm run mobile:preflight
 */

const baseUrl = (process.env.MOBILE_BASE_URL || "https://app.norma.casa").replace(/\/$/, "");

function fail(message) {
  console.error(`\n[mobile-preflight] FAIL: ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`[mobile-preflight] OK: ${message}`);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) fail(`${url} -> HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    const hint = text.slice(0, 120).replace(/\s+/g, " ");
    fail(`${url} non restituisce JSON valido (prefix: "${hint}")`);
  }
}

async function main() {
  console.log(`[mobile-preflight] Base URL: ${baseUrl}`);

  const aasaUrl = `${baseUrl}/.well-known/apple-app-site-association`;
  const assetlinksUrl = `${baseUrl}/.well-known/assetlinks.json`;

  const aasa = await fetchJson(aasaUrl);
  if (!aasa?.applinks?.details?.length) fail("AASA senza applinks.details");
  const appIds = aasa.applinks.details.flatMap((d) => {
    if (Array.isArray(d.appIDs)) return d.appIDs;
    if (typeof d.appID === "string" && d.appID) return [d.appID];
    return [];
  });
  if (!appIds.length) fail("AASA senza appIDs");
  ok(`AASA valido (${appIds.length} appID)`);

  const assetlinks = await fetchJson(assetlinksUrl);
  if (!Array.isArray(assetlinks) || assetlinks.length === 0) {
    fail("assetlinks.json vuoto o non-array");
  }
  const fingerprints = assetlinks.flatMap((d) => d?.target?.sha256_cert_fingerprints || []);
  if (!fingerprints.length) fail("assetlinks.json senza fingerprint SHA-256");
  ok(`assetlinks valido (${fingerprints.length} fingerprint)`);

  console.log("\n[mobile-preflight] PASS");
}

main().catch((err) => {
  fail(err instanceof Error ? err.message : "errore inatteso");
});
