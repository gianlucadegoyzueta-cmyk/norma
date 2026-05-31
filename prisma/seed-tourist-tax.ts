// ============================================================
//  SEED — Regole tassa di soggiorno (4 comuni ad alto volume)
//
//  IDEMPOTENTE: upsert per (comuneId, validFrom). Eseguibile più volte senza duplicare.
//  ⚠️ SEED INIZIALE DA RICONFERMARE: gli importi (specie Venezia) vanno verificati sul
//     regolamento comunale ufficiale prima del go-live. Le regole con `amountsToReconfirm`
//     vengono stampate con un avviso esplicito.
//
//  Uso:  npx tsx prisma/seed-tourist-tax.ts
//  NB: NON applica migrazioni; richiede che lo schema sia già migrato (tabelle presenti).
//      Crea i Comuni mancanti (per code) così il seed funziona anche su DB vuoto.
// ============================================================

import { PrismaClient } from "@prisma/client";
import { PrismaTouristTaxConfigRepository } from "../src/server/modules/tourist-tax/adapters/PrismaTouristTaxConfigRepository";
import { SEED_COMUNI } from "../src/server/modules/tourist-tax/domain/seed-data";

const prisma = new PrismaClient();

async function main() {
  const repo = new PrismaTouristTaxConfigRepository(prisma);
  let created = 0;
  let updated = 0;

  for (const c of SEED_COMUNI) {
    // Comune per code: lo creiamo se manca (idempotente), senza toccare quelli esistenti.
    const comune = await prisma.comune.upsert({
      where: { code: c.comuneCode },
      update: {},
      create: { code: c.comuneCode, name: c.comuneName, provincia: provinciaOf(c.comuneCode) },
    });

    const before = await repo.listVersions(comune.id);
    const existed = before.some((v) => v.validFrom.toISOString().slice(0, 10) === c.validFrom);

    await repo.upsertVersion({
      comuneId: comune.id,
      validFrom: new Date(`${c.validFrom}T00:00:00.000Z`),
      validTo: c.validTo ? new Date(`${c.validTo}T00:00:00.000Z`) : null,
      rule: c.rule,
    });

    if (existed) updated += 1;
    else created += 1;

    const warn = c.amountsToReconfirm
      ? "  ⚠️  IMPORTI DA RICONFERMARE sul regolamento ufficiale"
      : "";
    console.log(`• ${c.comuneName} (${c.comuneCode}) valido dal ${c.validFrom}${warn}`);
  }

  console.log(`\nSeed tassa di soggiorno completato: ${created} create, ${updated} aggiornate.`);
  console.log(
    "⚠️  SEED INIZIALE — riconfermare ogni regola sul regolamento comunale prima del go-live.",
  );
}

/** Provincia minima per i 4 comuni del seed (solo per creare il Comune se assente). */
function provinciaOf(code: string): string {
  const map: Record<string, string> = { H501: "RM", D612: "FI", F205: "MI", L736: "VE" };
  return map[code] ?? "XX";
}

main()
  .catch((e) => {
    console.error("Seed tassa di soggiorno fallito:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
