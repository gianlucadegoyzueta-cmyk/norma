import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Carica le variabili da .env (Node 20.12+/22): serve ai test di integrazione,
// che leggono DATABASE_URL. Se .env non c'è, nessun problema.
try {
  process.loadEnvFile(".env");
} catch {
  // .env assente: i test di integrazione si salteranno comunque.
}

export default defineConfig({
  // L'alias "@/..." dei sorgenti vale anche nei test (tsconfig paths non è letto da Vitest da solo).
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // tsconfig usa jsx:"preserve" (lo gestisce Next); per i test serve il transform automatico di React 19.
  esbuild: { jsx: "automatic" },
  test: {
    // Default "node" per i test di dominio/server. I test di componenti React dichiarano
    // "// @vitest-environment jsdom" nel proprio docblock (vedi *.test.tsx).
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Pool a processi (forks) invece dei worker-thread: il percorso del progetto contiene spazi
    // ("Desktop - MacBook Air…") e i worker di Vitest vanno in "Timeout calling fetch /@vite/env",
    // facendo fallire la raccolta dei test. I forks non soffrono di questo problema.
    pool: "forks",
  },
});
