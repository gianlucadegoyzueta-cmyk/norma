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
  },
});
