-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('AIRBNB', 'BOOKING', 'VRBO', 'OTHER');

-- CreateEnum
CREATE TYPE "StayImportStatus" AS ENUM ('DRAFT', 'CANCELLED', 'NEEDS_CANCEL_REVIEW');

-- AlterTable
ALTER TABLE "Stay" ADD COLUMN     "icalUid" TEXT,
ADD COLUMN     "importSource" "ReservationSource",
ADD COLUMN     "importStatus" "StayImportStatus",
ADD COLUMN     "reservationImportId" TEXT;

-- CreateTable
CREATE TABLE "ReservationImport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" "ReservationSource" NOT NULL DEFAULT 'OTHER',
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "lastImported" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationImport_organizationId_idx" ON "ReservationImport"("organizationId");

-- CreateIndex
CREATE INDEX "ReservationImport_propertyId_idx" ON "ReservationImport"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationImport_propertyId_url_key" ON "ReservationImport"("propertyId", "url");

-- CreateIndex
CREATE INDEX "Stay_reservationImportId_idx" ON "Stay"("reservationImportId");

-- CreateIndex
CREATE UNIQUE INDEX "Stay_reservationImportId_icalUid_key" ON "Stay"("reservationImportId", "icalUid");

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_reservationImportId_fkey" FOREIGN KEY ("reservationImportId") REFERENCES "ReservationImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationImport" ADD CONSTRAINT "ReservationImport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationImport" ADD CONSTRAINT "ReservationImport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

