-- CreateEnum
CREATE TYPE "TaxDeclarationStatus" AS ENUM ('DRAFT', 'READY', 'SUBMITTED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaxRemittanceMode" AS ENUM ('MANUAL_EXPORT', 'GECOS', 'PAGOPA', 'COMUNE_PORTAL');

-- DropIndex
DROP INDEX "TouristTaxConfig_comuneId_key";

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "accommodationCategory" TEXT,
ADD COLUMN     "touristTaxZone" TEXT;

-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "taxExemptionType" TEXT;

-- AlterTable
ALTER TABLE "TouristTaxDeclaration" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "remittanceMode" "TaxRemittanceMode" NOT NULL DEFAULT 'MANUAL_EXPORT',
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TaxDeclarationStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "TouristTaxDeclarationLine" (
    "id" TEXT NOT NULL,
    "declarationId" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "propertyName" TEXT NOT NULL,
    "taxedNights" INTEGER NOT NULL DEFAULT 0,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "breakdown" JSONB NOT NULL,

    CONSTRAINT "TouristTaxDeclarationLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TouristTaxDeclarationLine_declarationId_idx" ON "TouristTaxDeclarationLine"("declarationId");

-- CreateIndex
CREATE UNIQUE INDEX "TouristTaxDeclarationLine_declarationId_stayId_key" ON "TouristTaxDeclarationLine"("declarationId", "stayId");

-- CreateIndex
CREATE INDEX "TouristTaxConfig_comuneId_idx" ON "TouristTaxConfig"("comuneId");

-- CreateIndex
CREATE UNIQUE INDEX "TouristTaxConfig_comuneId_validFrom_key" ON "TouristTaxConfig"("comuneId", "validFrom");

-- CreateIndex
CREATE INDEX "TouristTaxDeclaration_organizationId_idx" ON "TouristTaxDeclaration"("organizationId");

-- CreateIndex
CREATE INDEX "TouristTaxDeclaration_status_idx" ON "TouristTaxDeclaration"("status");

-- AddForeignKey
ALTER TABLE "TouristTaxDeclarationLine" ADD CONSTRAINT "TouristTaxDeclarationLine_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "TouristTaxDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

