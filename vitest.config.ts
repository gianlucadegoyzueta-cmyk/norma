import { defineConfig } from "vitest/config";

// Carica le variabili da .env (Node 20.12+/22): serve ai test di integrazione,
// che leggono DATABASE_URL. Se .env non c'è, nessun problema.
try {
  process.loadEnvFile(".env");
} catch {
  // .env assente: i test di integrazione si salteranno comunque.
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Pool a processi (forks) invece dei worker-thread: il percorso del progetto contiene spazi
    // ("Desktop - MacBook Air…") e i worker di Vitest vanno in "Timeout calling fetch /@vite/env",
    // facendo fallire la raccolta dei test. I forks non soffrono di questo problema.
    pool: "forks",
  },
});
