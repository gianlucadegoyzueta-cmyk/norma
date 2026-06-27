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
      {
        // Il core Capacitor non è installato nell'ambiente test web/server. Stub minimale per i test
        // che importano `src/lib/native/index.ts` senza dover risolvere dipendenze native.
        find: /^@capacitor\/core$/,
        replacement: fileURLToPath(new URL("./test/stubs/capacitor-core.ts", import.meta.url)),
      },
      {
        find: /^@capacitor\/status-bar$/,
        replacement: fileURLToPath(
          new URL("./test/stubs/capacitor-status-bar.ts", import.meta.url),
        ),
      },
      {
        find: /^@capacitor\/splash-screen$/,
        replacement: fileURLToPath(
          new URL("./test/stubs/capacitor-splash-screen.ts", import.meta.url),
        ),
      },
      {
        find: /^@capacitor\/app$/,
        replacement: fileURLToPath(new URL("./test/stubs/capacitor-app.ts", import.meta.url)),
      },
      {
        find: /^@capacitor\/push-notifications$/,
        replacement: fileURLToPath(
          new URL("./test/stubs/capacitor-push-notifications.ts", import.meta.url),
        ),
      },
      {
        find: /^@capacitor\/browser$/,
        replacement: fileURLToPath(new URL("./test/stubs/capacitor-browser.ts", import.meta.url)),
      },
      {
        find: /^@aparajita\/capacitor-biometric-auth$/,
        replacement: fileURLToPath(
          new URL("./test/stubs/capacitor-biometric-auth.ts", import.meta.url),
        ),
      },
      {
        find: /^@capacitor\/camera$/,
        replacement: fileURLToPath(new URL("./test/stubs/capacitor-camera.ts", import.meta.url)),
      },
      {
        find: /^@pantrist\/capacitor-plugin-ml-kit-text-recognition$/,
        replacement: fileURLToPath(
          new URL("./test/stubs/capacitor-mlkit-text.ts", import.meta.url),
        ),
      },
      {
        find: /^@capacitor\/filesystem$/,
        replacement: fileURLToPath(
          new URL("./test/stubs/capacitor-filesystem.ts", import.meta.url),
        ),
      },
      {
        find: /^@capacitor\/share$/,
        replacement: fileURLToPath(new URL("./test/stubs/capacitor-share.ts", import.meta.url)),
      },
    ],
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
