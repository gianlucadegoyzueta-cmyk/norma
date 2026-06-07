-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "residenceComuneId" TEXT,
ADD COLUMN     "residenceCountryId" TEXT;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_residenceCountryId_fkey" FOREIGN KEY ("residenceCountryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_residenceComuneId_fkey" FOREIGN KEY ("residenceComuneId") REFERENCES "Comune"("id") ON DELETE SET NULL ON UPDATE CASCADE;

