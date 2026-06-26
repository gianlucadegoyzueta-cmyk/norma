#!/usr/bin/env node
/**
 * Genera PDF dalla mappa concettuale HTML.
 * Uso: node scripts/generate-mappa-pdf.mjs
 */
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = path.join(root, "tmp/norma-mappa-concettuale.html");
const pdfPath = path.join(root, "tmp/norma-mappa-concettuale.pdf");

const chromePaths = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  path.join(
    process.env.HOME ?? "",
    "Library/Caches/ms-playwright/chromium-1223/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  ),
];

const executablePath = chromePaths.find((p) => existsSync(p));

const browser = await chromium.launch(
  executablePath ? { executablePath, headless: true } : { headless: true },
);
const page = await browser.newPage();
await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
});
await browser.close();

console.log(pdfPath);
