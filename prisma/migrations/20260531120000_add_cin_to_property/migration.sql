-- Commit 1 CIN — Codice Identificativo Nazionale su Property.
-- NON applicata automaticamente: eseguire con `npx prisma migrate deploy` (o `migrate dev`).

-- CreateEnum
CREATE TYPE "CinStatus" AS ENUM ('PENDING', 'OBTAINED', 'NOT_REQUIRED');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "cin" TEXT,
ADD COLUMN "cinStatus" "CinStatus" NOT NULL DEFAULT 'PENDING';
