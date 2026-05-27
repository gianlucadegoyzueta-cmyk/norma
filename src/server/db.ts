import { PrismaClient } from "@prisma/client";

// Client Prisma in singleton.
// In sviluppo Next.js ricarica i moduli "a caldo" (hot reload): senza questo
// accorgimento creeremmo decine di connessioni al database. Riusiamo l'istanza
// salvandola su globalThis.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
