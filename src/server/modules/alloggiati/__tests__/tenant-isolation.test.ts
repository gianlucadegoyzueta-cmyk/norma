import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { InMemorySchedinaRepository } from "../adapters/InMemorySchedinaRepository";
import { PrismaCredentialRepository } from "../adapters/PrismaCredentialRepository";
import { PrismaSchedinaRepository } from "../adapters/PrismaSchedinaRepository";

/**
 * ISOLAMENTO MULTI-TENANT a livello di repository.
 *
 * Leggere un record dell'organization A passando l'organizationId dell'organization B NON deve
 * restituire nulla. La garanzia deve venire dalla QUERY del repository, non dalla disciplina del
 * chiamante.
 *
 * Per gli adapter Prisma usiamo un fake di PrismaClient il cui `findFirst` filtra su TUTTE le
 * chiavi di `where`: se un metodo dimenticasse `organizationId` nella query, una lettura cross-org
 * restituirebbe la riga e questi test fallirebbero. È esattamente la regressione da blindare.
 */
type Row = Record<string, unknown>;

/**
 * Modello Prisma finto. `findFirst` e `updateMany` filtrano su TUTTE le chiavi di `where`: se un
 * metodo del repository dimenticasse `organizationId`, una lettura/scrittura cross-org colpirebbe
 * la riga e i test fallirebbero. `updateMany` muta le righe corrispondenti e ritorna `{ count }`
 * come Prisma.
 */
/** Confronto di un campo: uguaglianza, o operatore Prisma `{ lt }` (usato da listPending su attempts). */
function matchesField(rowVal: unknown, cond: unknown): boolean {
  if (cond && typeof cond === "object" && "lt" in (cond as Row)) {
    return (rowVal as number) < ((cond as Row).lt as number);
  }
  return rowVal === cond;
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => matchesField(row[k], v));
}

function fakeModel(rows: Row[]) {
  return {
    findFirst: async ({ where }: { where: Row }) => rows.find((r) => matches(r, where)) ?? null,
    findMany: async ({ where }: { where: Row }) => rows.filter((r) => matches(r, where)),
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const hit = rows.filter((r) => matches(r, where));
      for (const r of hit) Object.assign(r, data);
      return { count: hit.length };
    },
  };
}

describe("Isolamento multi-tenant nei repository", () => {
  describe("PrismaCredentialRepository.getById(id, organizationId)", () => {
    const rows: Row[] = [
      {
        id: "credA",
        organizationId: "orgA",
        label: "Cred A",
        category: "SINGOLA",
        provincia: "RM",
        status: "ACTIVE",
        secretRef: "ref_A",
      },
    ];
    const prisma = { alloggiatiCredential: fakeModel(rows) } as unknown as PrismaClient;
    const repo = new PrismaCredentialRepository(prisma);

    it("org diversa (B) → null (non si legge la credenziale di un'altra org)", async () => {
      expect(await repo.getById("credA", "orgB")).toBeNull();
    });

    it("stessa org (A) → record restituito", async () => {
      expect((await repo.getById("credA", "orgA"))?.id).toBe("credA");
    });
  });

  describe("PrismaSchedinaRepository.findById(id, organizationId)", () => {
    const rows: Row[] = [
      {
        id: "schedA",
        organizationId: "orgA",
        credentialId: "credA",
        status: "PENDING",
        dedupKey: "dk_A",
      },
    ];
    const prisma = { schedina: fakeModel(rows) } as unknown as PrismaClient;
    const repo = new PrismaSchedinaRepository(prisma);

    it("org diversa (B) → null (non si legge la schedina di un'altra org)", async () => {
      expect(await repo.findById("schedA", "orgB")).toBeNull();
    });

    it("stessa org (A) → record restituito", async () => {
      expect((await repo.findById("schedA", "orgA"))?.id).toBe("schedA");
    });
  });

  describe("InMemorySchedinaRepository.findById (stesso contratto dell'adapter Prisma)", () => {
    it("org diversa → null; stessa org → record", async () => {
      const repo = new InMemorySchedinaRepository();
      const { schedina } = await repo.createIntent({
        organizationId: "orgA",
        credentialId: "credA",
        guestId: "g1",
        deadlineAt: new Date("2026-01-02T00:00:00Z"),
        dedup: {
          struttura: "credA",
          idAppartamento: null,
          dataArrivo: "2026-01-01",
          numeroDocumento: "D1",
          cognome: "ROSSI",
          nome: "MARIO",
          dataNascita: "1990-01-01",
        },
      });
      expect(await repo.findById(schedina.id, "orgB")).toBeNull();
      expect((await repo.findById(schedina.id, "orgA"))?.id).toBe(schedina.id);
    });
  });

  describe("list*ByCredential — isolamento org (difesa in profondità)", () => {
    // Stessa credenziale, due org diverse: il filtro org deve separarle. Senza org (path cron
    // mono-credenziale) si vedono tutte le righe della credenziale.
    function rows(): Row[] {
      return [
        {
          id: "pA",
          organizationId: "orgA",
          credentialId: "credX",
          status: "PENDING",
          attempts: 0,
          dedupKey: "dk1",
        },
        {
          id: "pB",
          organizationId: "orgB",
          credentialId: "credX",
          status: "PENDING",
          attempts: 0,
          dedupKey: "dk2",
        },
        {
          id: "uA",
          organizationId: "orgA",
          credentialId: "credX",
          status: "UNVERIFIED",
          attempts: 0,
          dedupKey: "dk3",
        },
        {
          id: "uB",
          organizationId: "orgB",
          credentialId: "credX",
          status: "UNVERIFIED",
          attempts: 0,
          dedupKey: "dk4",
        },
      ];
    }

    it("Prisma listPendingByCredential con org → solo le righe di quell'org", async () => {
      const prisma = { schedina: fakeModel(rows()) } as unknown as PrismaClient;
      const repo = new PrismaSchedinaRepository(prisma);
      expect((await repo.listPendingByCredential("credX", "orgA")).map((r) => r.id)).toEqual([
        "pA",
      ]);
    });

    it("Prisma listPendingByCredential senza org → tutte le PENDING della credenziale (path cron)", async () => {
      const prisma = { schedina: fakeModel(rows()) } as unknown as PrismaClient;
      const repo = new PrismaSchedinaRepository(prisma);
      expect((await repo.listPendingByCredential("credX")).map((r) => r.id).sort()).toEqual([
        "pA",
        "pB",
      ]);
    });

    it("Prisma listUnverifiedByCredential con org → solo quell'org", async () => {
      const prisma = { schedina: fakeModel(rows()) } as unknown as PrismaClient;
      const repo = new PrismaSchedinaRepository(prisma);
      expect((await repo.listUnverifiedByCredential("credX", "orgB")).map((r) => r.id)).toEqual([
        "uB",
      ]);
    });

    it("InMemory rispetta lo stesso contratto org", async () => {
      const repo = new InMemorySchedinaRepository();
      const mk = (organizationId: string, n: string) =>
        repo.createIntent({
          organizationId,
          credentialId: "credX",
          guestId: `g${n}`,
          deadlineAt: new Date("2026-01-02T00:00:00Z"),
          dedup: {
            struttura: "credX",
            idAppartamento: null,
            dataArrivo: "2026-01-01",
            numeroDocumento: `D${n}`,
            cognome: "ROSSI",
            nome: "MARIO",
            dataNascita: "1990-01-01",
          },
        });
      await mk("orgA", "1");
      await mk("orgB", "2");
      const a = await repo.listPendingByCredential("credX", "orgA");
      expect(a).toHaveLength(1);
      expect(a[0].organizationId).toBe("orgA");
      expect(await repo.listPendingByCredential("credX")).toHaveLength(2);
    });
  });

  describe("PrismaCredentialRepository write — updateStatus / markVerified", () => {
    function setup() {
      const rows: Row[] = [
        {
          id: "credA",
          organizationId: "orgA",
          status: "PENDING_REONBOARDING",
          lastVerifiedAt: null,
        },
      ];
      const prisma = { alloggiatiCredential: fakeModel(rows) } as unknown as PrismaClient;
      return { rows, repo: new PrismaCredentialRepository(prisma) };
    }

    it("updateStatus da un'altra org (B) → NON modifica la credenziale di A", async () => {
      const { rows, repo } = setup();
      await repo.updateStatus("credA", "orgB", "INVALID");
      expect(rows[0].status).toBe("PENDING_REONBOARDING"); // invariato
    });

    it("updateStatus dalla stessa org (A) → aggiorna", async () => {
      const { rows, repo } = setup();
      await repo.updateStatus("credA", "orgA", "INVALID");
      expect(rows[0].status).toBe("INVALID");
    });

    it("markVerified da un'altra org (B) → NON marca ACTIVE la credenziale di A", async () => {
      const { rows, repo } = setup();
      await repo.markVerified("credA", "orgB");
      expect(rows[0].status).toBe("PENDING_REONBOARDING");
      expect(rows[0].lastVerifiedAt).toBeNull();
    });

    it("markVerified dalla stessa org (A) → ACTIVE + lastVerifiedAt valorizzato", async () => {
      const { rows, repo } = setup();
      await repo.markVerified("credA", "orgA");
      expect(rows[0].status).toBe("ACTIVE");
      expect(rows[0].lastVerifiedAt).toBeInstanceOf(Date);
    });
  });
});
