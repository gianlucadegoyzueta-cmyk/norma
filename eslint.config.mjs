import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  {
    // `.claude/` è tooling interno dell'agente (alcuni file sono symlink alla home dello sviluppatore):
    // non è codice di prodotto e va escluso dal lint, altrimenti i symlink rompono la CI (ENOENT).
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
      ".claude/**",
    ],
  },
  // `prettier` disabilita le regole stilistiche di ESLint che entrerebbero in
  // conflitto con Prettier: la formattazione la gestisce Prettier, le regole di
  // qualità ESLint.
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
