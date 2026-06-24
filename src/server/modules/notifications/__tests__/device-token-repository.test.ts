import { describe, expect, it } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaDeviceTokenRepository } from "../adapters/PrismaDeviceTokenRepository";

/** Errore Prisma "tabella inesistente" (migrazione non applicata). */
const P2021 = Object.assign(new Error("table does not exist"), { code: "P2021" });

/** Stub prisma che simula la tabella DeviceToken assente. */
function prismaWithMissingTable(): PrismaClient {
  const throwMissing = () => {
    throw P2021;
  };
  return {
    deviceToken: {
      upsert: throwMissing,
      deleteMany: throwMissing,
      findMany: throwMissing,
    },
  } as unknown as PrismaClient;
}

describe("PrismaDeviceTokenRepository (degrado P2021)", () => {
  it("register è no-op se la tabella non esiste", async () => {
    const repo = new PrismaDeviceTokenRepository(prismaWithMissingTable());
    await expect(repo.register("u1", { token: "tok-a", platform: "IOS" })).resolves.toBeUndefined();
  });

  it("listTokensForUser ritorna [] se la tabella non esiste", async () => {
    const repo = new PrismaDeviceTokenRepository(prismaWithMissingTable());
    await expect(repo.listTokensForUser("u1")).resolves.toEqual([]);
  });

  it("remove è no-op se la tabella non esiste", async () => {
    const repo = new PrismaDeviceTokenRepository(prismaWithMissingTable());
    await expect(repo.remove("tok-a")).resolves.toBeUndefined();
  });

  it("propaga errori diversi da P2021", async () => {
    const boom = Object.assign(new Error("connessione persa"), { code: "P1001" });
    const prisma = {
      deviceToken: {
        findMany: () => {
          throw boom;
        },
      },
    } as unknown as PrismaClient;
    const repo = new PrismaDeviceTokenRepository(prisma);
    await expect(repo.listTokensForUser("u1")).rejects.toBe(boom);
  });
});
