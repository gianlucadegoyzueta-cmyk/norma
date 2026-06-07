-- CreateTable
CREATE TABLE "IstatSubmission" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "arriviTotal" INTEGER NOT NULL,
    "presenzeTotal" INTEGER NOT NULL,
    "rows" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IstatSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IstatSubmission_organizationId_period_key" ON "IstatSubmission"("organizationId", "period");

-- AddForeignKey
ALTER TABLE "IstatSubmission" ADD CONSTRAINT "IstatSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

