import type { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaSchedinaRepository } from "../adapters/PrismaSchedinaRepository";
import type { CreateIntentInput } from "../ports/SchedinaRepository";

// Test di INTEGRAZIONE: tocca un database reale.
// Si esegue SOLO con RUN_DB_TESTS=1 e DATABASE_URL che punta a un DB con le
// migrazioni applicate. Altrimenti viene saltato.
const runDb = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!runDb)("PrismaSchedinaRepository — integrazione (DB reale)", () => {
  let prisma: PrismaClient;
  let repo: PrismaSchedinaRepository;

  const s = Date.now().toString();
  const ids = {
    org: `itest_org_${s}`,
    comune: `itest_com_${s}`,
    country: `itest_country_${s}`,
    cred: `itest_cred_${s}`,
    prop: `itest_prop_${s}`,
    stay: `itest_stay_${s}`,
    g1: `itest_g1_${s}`,
    g2: `itest_g2_${s}`,
  };

  beforeAll(async () => {
    const { PrismaClient } = await import("@prisma/client");
    // Il test runner è un processo Node long-running con transazioni interattive:
    // usiamo la connessione DIRETTA/session (DIRECT_URL), non il transaction pooler.
    const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
    prisma = new PrismaClient({ datasourceUrl: url });
    repo = new PrismaSchedinaRepository(prisma);

    await prisma.organization.create({ data: { id: ids.org, name: "ITest Org" } });
    await prisma.comune.create({
      data: { id: ids.comune, code: `C${s}`, name: "Roma", provincia: "RM" },
    });
    await prisma.country.create({ data: { id: ids.country, code: `S${s}`, name: "ITALIA" } });
    await prisma.alloggiatiCredential.create({
      data: {
        id: ids.cred,
        organizationId: ids.org,
        label: "ITest",
        category: "SINGOLA",
        provincia: "RM",
        secretRef: `ref_${s}`,
      },
    });
    await prisma.property.create({
      data: {
        id: ids.prop,
        organizationId: ids.org,
        name: "ITest Prop",
        address: "Via X 1",
        comuneId: ids.comune,
        proprietario: "Tizio",
        credentialId: ids.cred,
      },
    });
    await prisma.stay.create({
      data: {
        id: ids.stay,
        organizationId: ids.org,
        propertyId: ids.prop,
        arrivalDate: new Date("2026-06-01T15:00:00Z"),
        guestsCount: 2,
      },
    });
    for (const gid of [ids.g1, ids.g2]) {
      await prisma.guest.create({
        data: {
          id: gid,
          organizationId: ids.org,
          stayId: ids.stay,
          firstName: "Mario",
          lastName: "Rossi",
          sex: "M",
          birthDate: new Date("1990-05-20"),
          birthCountryId: ids.country,
          citizenshipId: ids.country,
          tipoAlloggiato: "OSPITE_SINGOLO",
        },
      });
    }
  });

  afterAll(async () => {
    if (!prisma) return;
    // Organization cascata su credential/property/stay/guest/schedina/event
    await prisma.organization.delete({ where: { id: ids.org } }).catch(() => undefined);
    await prisma.comune.delete({ where: { id: ids.comune } }).catch(() => undefined);
    await prisma.country.delete({ where: { id: ids.country } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  const dedup: CreateIntentInput["dedup"] = {
    struttura: "", // valorizzato nei test col credentialId
    idAppartamento: null,
    dataArrivo: "2026-06-01",
    numeroDocumento: "AB1234567",
    cognome: "Rossi",
    nome: "Mario",
    dataNascita: "1990-05-20",
  };

  it("createIntent è idempotente sul vincolo UNIQUE (organizationId, dedupKey)", async () => {
    const d = { ...dedup, struttura: ids.cred };
    const first = await repo.createIntent({
      organizationId: ids.org,
      credentialId: ids.cred,
      guestId: ids.g1,
      deadlineAt: new Date(),
      dedup: d,
    });
    // secondo intento: stesso dedup, ma altro ospite (doppia battitura) → deve essere bloccato
    const second = await repo.createIntent({
      organizationId: ids.org,
      credentialId: ids.cred,
      guestId: ids.g2,
      deadlineAt: new Date(),
      dedup: d,
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.schedina.id).toBe(first.schedina.id);
    expect(await prisma.schedina.count({ where: { organizationId: ids.org } })).toBe(1);
  });

  it("ciclo PENDING → SENDING → ACQUIRED con eventi di audit", async () => {
    const sched = await prisma.schedina.findFirstOrThrow({ where: { organizationId: ids.org } });
    await repo.markSending(sched.id);
    await repo.applyDecision(sched.id, { status: "ACQUIRED", errorCod: null, errorDes: null });

    const after = await prisma.schedina.findUniqueOrThrow({ where: { id: sched.id } });
    expect(after.status).toBe("ACQUIRED");
    expect(after.acquiredAt).not.toBeNull();
    expect(
      await prisma.schedinaEvent.count({ where: { schedinaId: sched.id } }),
    ).toBeGreaterThanOrEqual(2);
  });

  it("rifiuta una transizione illegale (ACQUIRED → SENDING)", async () => {
    const sched = await prisma.schedina.findFirstOrThrow({ where: { organizationId: ids.org } });
    await expect(repo.markSending(sched.id)).rejects.toThrow();
  });
});
