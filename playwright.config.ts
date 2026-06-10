import { defineConfig, devices } from "@playwright/test";

/**
 * Quality gate E2E: smoke minimo sull'app (NON il marketing, repo separato).
 * Obiettivo dichiarato: restare sotto i 5 minuti in CI → un solo browser (chromium),
 * suite snella, niente screenshot/video se non al retry.
 *
 * Il server sotto test è l'app in produzione (`next start` dopo `next build`): è il modo
 * più fedele a com'è in Vercel. In locale riusa un server già avviato; in CI lo avvia lei.
 */
const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Un solo file di smoke, ma teniamo i test isolati e paralleli dove possibile.
  fullyParallel: true,
  // In CI vietiamo i `.only` dimenticati e diamo un retry (flake di rete sul primo avvio).
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PORT: String(PORT) },
  },
});
