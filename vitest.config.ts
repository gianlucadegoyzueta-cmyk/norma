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
  resolve: {
    // Array form con regex: `^@/` evita di intercettare gli scope npm (@prisma/*, @anthropic-ai/*…).
    alias: [
      {
        // `@/...` → `src/...` (stesso path mapping di tsconfig): permette ai test di importare moduli
        // applicativi che usano l'alias `@/` (es. le funzioni dati delle pagine).
        find: /^@\//,
        replacement: `${fileURLToPath(new URL("./src", import.meta.url))}/`,
      },
      {
        // `server-only` è fornito da Next solo a runtime; nei test non esiste. Lo stub vuoto consente
        // di importare moduli marcati server-only sotto vitest.
        find: /^server-only$/,
        replacement: fileURLToPath(new URL("./test/stubs/server-only.ts", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Pool a processi (forks) invece dei worker-thread: il percorso del progetto contiene spazi
    // ("Desktop - MacBook Air…") e i worker di Vitest vanno in "Timeout calling fetch /@vite/env",
    // facendo fallire la raccolta dei test. I forks non soffrono di questo problema.
    pool: "forks",
  },
});
