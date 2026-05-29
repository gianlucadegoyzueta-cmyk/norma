#!/usr/bin/env node
// Imposta la password del database Supabase nel file .env, in modo SICURO:
//  - aggiorna ENTRAMBE le righe (DATABASE_URL e DIRECT_URL);
//  - applica il percent-encoding (gestisce eventuali caratteri speciali nella URL);
//  - non tocca utente / host / porte / parametri (es. ?pgbouncer=true);
//  - rifiuta password con parentesi quadre [ ] (il segnaposto Supabase: vanno tolte).
//
// Uso:
//   node scripts/set-db-password.mjs 'LA_TUA_PASSWORD'
//   npm run db:password -- 'LA_TUA_PASSWORD'
//
// Dopo: npx prisma migrate deploy
import { readFileSync, writeFileSync } from "node:fs";

const password = process.argv[2];
if (!password) {
  console.error("Uso: node scripts/set-db-password.mjs '<password>'");
  process.exit(1);
}
if (/^\[.*\]$/.test(password)) {
  console.error(
    "⚠️  La password ha parentesi quadre [ ]: rimuovile (non fanno parte della password).",
  );
  process.exit(1);
}

const encoded = encodeURIComponent(password);
const envUrl = new URL("../.env", import.meta.url);
let env = readFileSync(envUrl, "utf8");

let count = 0;
env = env.replace(
  /^(DATABASE_URL|DIRECT_URL)=("?)postgresql:\/\/([^:@]+):[^@]*@/gm,
  (_match, key, quote, user) => {
    count += 1;
    return `${key}=${quote}postgresql://${user}:${encoded}@`;
  },
);

if (count < 2) {
  console.error(
    `⚠️  Attese 2 righe (DATABASE_URL + DIRECT_URL), trovate ${count}. Controlla il .env.`,
  );
  process.exit(1);
}

writeFileSync(envUrl, env);
console.log(
  `✅ Password impostata in ${count} URL (lunghezza ${password.length}). Ora esegui: npx prisma migrate deploy`,
);
