import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AlloggiatiSecret } from "../SecretsVault";
import { PrismaSecretsVault } from "../PrismaSecretsVault";

/**
 * Test del VAULT DI PRODUZIONE (PrismaSecretsVault), che cifra i segreti delle credenziali
 * Alloggiati con AES-256-GCM. L'audit aveva segnalato l'assenza di test su una parte critica
 * (custodia di credenziali di accesso a un sistema della Polizia di Stato).
 *
 * Niente filesystem né DB reale: un fake di `prisma.secret` tiene i blob cifrati in memoria, così
 * i test sono ermetici e veloci ed esercitano il VERO codice di cifratura/decifratura. Verifichiamo:
 *  - round-trip cifra→decifra (store/retrieve/update/delete);
 *  - at-rest il segreto NON è in chiaro;
 *  - l'IV (nonce GCM) è nuovo a ogni cifratura (no ciphertext deterministico);
 *  - MANOMISSIONE di authTag o ciphertext → la decifratura FALLISCE (autenticazione GCM);
 *  - la chiave vive SOLO in env e dev'essere valida (64 hex).
 */

type SecretRow = { id: string; iv: string; authTag: string; data: string };

/** Fake minimale di `prisma.secret` con storage in memoria. `rows` è ispezionabile dai test. */
function makeFakePrisma(): { prisma: PrismaClient; rows: Map<string, SecretRow> } {
  const rows = new Map<string, SecretRow>();
  let seq = 0;
  const secret = {
    create: async ({ data }: { data: Omit<SecretRow, "id">; select?: unknown }) => {
      const id = `sec_${++seq}`;
      rows.set(id, { id, ...data });
      return { id };
    },
    findUnique: async ({ where }: { where: { id: string } }) => rows.get(where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Omit<SecretRow, "id"> }) => {
      if (!rows.has(where.id)) throw new Error(`row non trovata: ${where.id}`);
      const updated = { id: where.id, ...data };
      rows.set(where.id, updated);
      return updated;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const cur = rows.get(where.id);
      if (!cur) throw new Error(`row non trovata: ${where.id}`);
      rows.delete(where.id);
      return cur;
    },
  };
  return { prisma: { secret } as unknown as PrismaClient, rows };
}

const SECRET: AlloggiatiSecret = {
  utente: "RM000123",
  password: "sup3r-s3greta!",
  wskey: "WSKEY-abc-987",
};

describe("PrismaSecretsVault (AES-256-GCM)", () => {
  it("round-trip: store → retrieve restituisce lo stesso segreto", async () => {
    const { prisma } = makeFakePrisma();
    const vault = new PrismaSecretsVault(prisma);
    const ref = await vault.store(SECRET);
    expect(await vault.retrieve(ref)).toEqual(SECRET);
  });

  it("update sostituisce il segreto cifrato; retrieve legge il nuovo valore", async () => {
    const { prisma } = makeFakePrisma();
    const vault = new PrismaSecretsVault(prisma);
    const ref = await vault.store(SECRET);
    const nuovo: AlloggiatiSecret = { ...SECRET, password: "nuova-password" };
    await vault.update(ref, nuovo);
    expect(await vault.retrieve(ref)).toEqual(nuovo);
  });

  it("delete rimuove il segreto; retrieve poi fallisce", async () => {
    const { prisma } = makeFakePrisma();
    const vault = new PrismaSecretsVault(prisma);
    const ref = await vault.store(SECRET);
    await vault.delete(ref);
    await expect(vault.retrieve(ref)).rejects.toThrow(/non trovato/i);
  });

  it("retrieve di un riferimento inesistente fallisce", async () => {
    const { prisma } = makeFakePrisma();
    const vault = new PrismaSecretsVault(prisma);
    await expect(vault.retrieve("sec_inesistente")).rejects.toThrow(/non trovato/i);
  });

  it("at-rest il segreto NON è in chiaro (password/wskey non compaiono nel blob)", async () => {
    const { prisma, rows } = makeFakePrisma();
    const vault = new PrismaSecretsVault(prisma);
    const ref = await vault.store(SECRET);
    const row = rows.get(ref)!;
    const blobConcat = `${row.iv}${row.authTag}${row.data}`;
    expect(blobConcat).not.toContain(SECRET.password);
    expect(blobConcat).not.toContain(SECRET.wskey);
    expect(blobConcat).not.toContain(SECRET.utente);
    // il blob ha i tre campi GCM, in esadecimale
    expect(row.iv).toMatch(/^[0-9a-f]+$/);
    expect(row.authTag).toMatch(/^[0-9a-f]+$/);
    expect(row.data).toMatch(/^[0-9a-f]+$/);
  });

  it("IV nuovo a ogni cifratura: lo stesso segreto cifrato due volte → blob diversi", async () => {
    const { prisma, rows } = makeFakePrisma();
    const vault = new PrismaSecretsVault(prisma);
    const ref1 = await vault.store(SECRET);
    const ref2 = await vault.store(SECRET);
    const a = rows.get(ref1)!;
    const b = rows.get(ref2)!;
    expect(a.iv).not.toBe(b.iv); // nonce diverso
    expect(a.data).not.toBe(b.data); // → ciphertext diverso
    // ma entrambi decifrano allo stesso segreto
    expect(await vault.retrieve(ref1)).toEqual(await vault.retrieve(ref2));
  });

  it("MANOMISSIONE dell'authTag → la decifratura FALLISCE (autenticazione GCM)", async () => {
    const { prisma, rows } = makeFakePrisma();
    const vault = new PrismaSecretsVault(prisma);
    const ref = await vault.store(SECRET);
    const row = rows.get(ref)!;
    // Flippa il primo nibble dell'authTag mantenendo la lunghezza/forma hex.
    const flipped = (row.authTag[0] === "a" ? "b" : "a") + row.authTag.slice(1);
    rows.set(ref, { ...row, authTag: flipped });
    await expect(vault.retrieve(ref)).rejects.toThrow();
  });

  it("MANOMISSIONE del ciphertext → la decifratura FALLISCE", async () => {
    const { prisma, rows } = makeFakePrisma();
    const vault = new PrismaSecretsVault(prisma);
    const ref = await vault.store(SECRET);
    const row = rows.get(ref)!;
    const flipped = (row.data[0] === "a" ? "b" : "a") + row.data.slice(1);
    rows.set(ref, { ...row, data: flipped });
    await expect(vault.retrieve(ref)).rejects.toThrow();
  });

  describe("validazione della chiave (solo da env, mai dal DB)", () => {
    let original: string | undefined;
    beforeEach(() => {
      original = process.env.SECRETS_LOCAL_KEY;
    });
    afterEach(() => {
      // Ripristina sempre la chiave reale per non disturbare gli altri test.
      if (original === undefined) delete process.env.SECRETS_LOCAL_KEY;
      else process.env.SECRETS_LOCAL_KEY = original;
    });

    it("chiave assente → store fallisce con messaggio chiaro", async () => {
      delete process.env.SECRETS_LOCAL_KEY;
      const { prisma } = makeFakePrisma();
      await expect(new PrismaSecretsVault(prisma).store(SECRET)).rejects.toThrow(
        /SECRETS_LOCAL_KEY/,
      );
    });

    it("chiave di lunghezza errata (non 64 hex) → store fallisce", async () => {
      process.env.SECRETS_LOCAL_KEY = "troppo-corta";
      const { prisma } = makeFakePrisma();
      await expect(new PrismaSecretsVault(prisma).store(SECRET)).rejects.toThrow(
        /SECRETS_LOCAL_KEY/,
      );
    });
  });
});
