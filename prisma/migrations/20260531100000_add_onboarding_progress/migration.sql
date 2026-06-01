-- Fase C — Onboarding wizard: stato "soft" del wizard (passi non derivabili dai dati di dominio).
-- NON applicata automaticamente: eseguire con `npx prisma migrate deploy` (o `migrate dev`).

-- CreateEnum
CREATE TYPE "OnboardingUserType" AS ENUM ('HOST_SINGOLO', 'PROPERTY_MANAGER');

-- CreateTable
CREATE TABLE "OnboardingProgress" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userType" "OnboardingUserType",
    "structuresCount" INTEGER,
    "welcomedAt" TIMESTAMP(3),
    "identityDoneAt" TIMESTAMP(3),
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingProgress_organizationId_key" ON "OnboardingProgress"("organizationId");

-- AddForeignKey
ALTER TABLE "OnboardingProgress" ADD CONSTRAINT "OnboardingProgress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
