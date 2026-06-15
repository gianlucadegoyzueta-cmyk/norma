-- AlterTable
ALTER TABLE "Guest" ADD COLUMN     "tourismType" TEXT,
ADD COLUMN     "transportMeans" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "camereDisponibili" INTEGER,
ADD COLUMN     "lettiDisponibili" INTEGER,
ADD COLUMN     "ross1000Code" TEXT;
