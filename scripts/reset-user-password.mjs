#!/usr/bin/env node
// Reset SICURO della password di un utente (passwordHash bcrypt) direttamente nel DB di produzione.
// La nuova password si DIGITA a runtime, NASCOSTA: non passa come argomento, non finisce nei log, mai in chat.
// Stesso hashing dell'app (src/server/auth/password.ts): bcrypt cost 12, regole min-8 + lettera + numero.
// Funziona anche se l'account era solo magic-link/Google (passwordHash null → viene impostato).
//
// Uso:  node scripts/reset-user-password.mjs <email>
//
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import readline from "node:readline";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// --- carica .env (un node script puro non lo fa da solo): serve DATABASE_URL ---
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(join(root, ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const rawEmail = process.argv[2];
if (!rawEmail) {
  console.error("Uso: node scripts/reset-user-password.mjs <email>");
  process.exit(1);
}
const email = rawEmail.trim().toLowerCase(); // l'app normalizza così

function promptHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let shownQuery = false;
    rl._writeToOutput = () => {
      if (!shownQuery) {
        rl.output.write(query);
        shownQuery = true;
      } // mostra la domanda, nasconde i tasti
    };
    rl.question(query, (answer) => {
      rl.output.write("\n");
      rl.close();
      resolve(answer);
    });
  });
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user) {
    console.error(`\n❌ Nessun utente con email "${email}". Controlla l'email del tuo account.`);
    process.exit(1);
  }
  console.log(
    `Utente: ${user.email} — login password ${user.passwordHash ? "già presente (verrà sovrascritta)" : "ASSENTE (magic-link/Google) → verrà aggiunta"}.\n`,
  );

  const pw = await promptHidden("Nuova password (nascosta): ");
  const pw2 = await promptHidden("Conferma password:        ");
  if (pw !== pw2) {
    console.error("❌ Le password non coincidono.");
    process.exit(1);
  }
  if (pw.length < 8 || pw.length > 72 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
    console.error(
      "❌ Regole: minimo 8 caratteri, con almeno una lettera e un numero (massimo 72).",
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(pw, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  console.log(`\n✅ Password aggiornata per ${user.email}.`);
  console.log("   Ora accedi su https://app.norma.casa con email + nuova password.");
} finally {
  await prisma.$disconnect();
}
