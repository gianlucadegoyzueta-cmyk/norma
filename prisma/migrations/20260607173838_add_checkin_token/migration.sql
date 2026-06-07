-- CreateTable
CREATE TABLE "CheckinToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckinToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckinToken_tokenHash_key" ON "CheckinToken"("tokenHash");

-- CreateIndex
CREATE INDEX "CheckinToken_stayId_idx" ON "CheckinToken"("stayId");

-- AddForeignKey
ALTER TABLE "CheckinToken" ADD CONSTRAINT "CheckinToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckinToken" ADD CONSTRAINT "CheckinToken_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

